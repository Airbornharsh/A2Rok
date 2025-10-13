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

    const fetchOptions: RequestInit = {
      method: data.method,
      headers: {
        ...data.headers,
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
      const responseBody =
        (await response.json()) ||
        (await response.text()) ||
        (await response.blob()) ||
        (await response.arrayBuffer()) ||
        (await response.formData())
      const res = {
        pendingResponseId: data.pendingResponseId,
        domain: data.domain,
        port: data.port,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body: responseBody,
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
