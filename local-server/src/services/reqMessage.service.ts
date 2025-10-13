import { SubdomainRequest, SubdomainResponse } from '../types/instance'
import CompressionService from './compression.service'

class ReqMessageService {
  static async handleSubdomainRequest(
    data: SubdomainRequest,
    ws: WebSocket,
  ): Promise<SubdomainResponse> {
    // Handle body serialization based on content type
    let body: string | undefined
    if (data.body && data.method !== 'GET' && data.method !== 'HEAD') {
      if (typeof data.body === 'string') {
        body = data.body
      } else if (typeof data.body === 'object') {
        body = JSON.stringify(data.body)
      }
    }

    const { connection, ...headers } = data.headers

    const fetchOptions: RequestInit = {
      method: data.method,
      headers: {
        ...headers,
        host: 'localhost' + ':' + data.port,
      },
    }

    if (body !== undefined) {
      fetchOptions.body = body
    }

    try {
      const response = await fetch(
        `http://localhost:${data.port}${data.path}`,
        fetchOptions,
      )
      const headers = Object.fromEntries(response.headers.entries())

      const contentType =
        headers['content-type'] || headers['Content-Type'] || ''
      let body: any
      let isBase64 = false
      try {
        if (contentType.includes('application/json')) {
          body = await response.json()
        } else if (
          contentType.startsWith('text/') ||
          contentType.includes('application/xml') ||
          contentType.includes('application/xhtml+xml')
        ) {
          body = await response.text()
        } else {
          const buf = Buffer.from(await response.arrayBuffer())
          body = buf.toString('base64')
          isBase64 = true
        }
      } catch {
        try {
          body = await response.text()
        } catch {
          const buf = Buffer.from(await response.arrayBuffer())
          body = buf.toString('base64')
          isBase64 = true
        }
      }

      const res = {
        pendingResponseId: data.pendingResponseId,
        domain: data.domain,
        port: data.port,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body,
        contentType,
        isBase64,
      }

      ws.send(
        CompressionService.compressMessage({
          type: 'subdomain_response',
          data: res,
        }),
      )

      return res
    } catch (error) {
      console.error('Request failed:', error)

      const errorResponse = {
        pendingResponseId: data.pendingResponseId,
        domain: data.domain,
        port: data.port,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        body: {
          error: 'Request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Error',
        },
      }

      ws.send(
        CompressionService.compressMessage({
          type: 'subdomain_response',
          data: errorResponse,
        }),
      )

      return errorResponse
    }
  }
}

export default ReqMessageService
