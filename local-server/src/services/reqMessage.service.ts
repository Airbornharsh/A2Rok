import { SubdomainRequest, SubdomainResponse } from '../types/instance'
import CompressionService from './compression.service'
import crypto from 'crypto'

const apiHistory: {
  [key: string]: {
    route: string
    method: string
    status?: number
  }
} = {}

const recentRequests: Array<{
  id: string
  method: string
  route: string
  status?: number
}> = []

class ReqMessageService {
  static getRecentRequests() {
    return [...recentRequests]
  }
  static async handleSubdomainRequest(
    data: SubdomainRequest,
    ws: WebSocket,
  ): Promise<SubdomainResponse> {
    // Use enhanced request data if available
    const useEnhancedData =
      data.rawBody !== undefined && data.reconstructedPath !== undefined

    // Determine the target URL
    const targetPath = useEnhancedData ? data.reconstructedPath : data.path
    const targetUrl = `http://localhost:${data.port}${targetPath}`

    const incomingHeaders = data.headers || {}
    const hopByHopHeaders = new Set([
      'connection',
      'keep-alive',
      'transfer-encoding',
      'upgrade',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'content-length',
    ])
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(incomingHeaders)) {
      const lowerKey = key.toLowerCase()
      if (hopByHopHeaders.has(lowerKey)) continue
      if (typeof value === 'undefined' || value === null) continue
      headers[lowerKey] = String(value)
    }

    const originHeader = headers['origin']
    if (originHeader) {
      try {
        const url = new URL(originHeader)
        headers['x-forwarded-host'] = url.host
        headers['x-forwarded-proto'] = url.protocol.replace(':', '')
        if (url.port) {
          headers['x-forwarded-port'] = url.port
        }
      } catch {}
    } else if (data.originalHost) {
      headers['x-forwarded-host'] = data.originalHost
    }

    delete (headers as any)['host']

    // Content-Type aware body andling
    const contentType = headers['content-type'] || headers['Content-Type'] || ''
    let body: string | Buffer | undefined

    if (data.method !== 'GET' && data.method !== 'HEAD') {
      if (useEnhancedData && data.rawBody) {
        // Use raw body for binary data and form uploads
        if (
          contentType.includes('multipart/form-data') ||
          contentType.includes('application/octet-stream') ||
          contentType.includes('image/') ||
          contentType.includes('video/') ||
          contentType.includes('audio/')
        ) {
          body = Buffer.from(data.rawBody, 'base64')
        } else {
          // For text-based content, use raw body as string
          body = Buffer.from(data.rawBody, 'base64').toString('utf8')
        }
      } else if (data.body) {
        // Fallback to parsed body with proper serialization
        if (contentType.includes('application/json')) {
          body =
            typeof data.body === 'string'
              ? data.body
              : JSON.stringify(data.body)
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          body =
            typeof data.body === 'string'
              ? data.body
              : new URLSearchParams(data.body).toString()
        } else {
          body =
            typeof data.body === 'string'
              ? data.body
              : JSON.stringify(data.body)
        }
      }
    }

    // Preserve original host header if available, otherwise use localhost
    const hostHeader = data.originalHost || `localhost:${data.port}`

    const fetchOptions: RequestInit = {
      method: data.method,
      headers: {
        ...headers,
        host: hostHeader,
      },
    }

    if (body !== undefined) {
      fetchOptions.body = body
    }

    const uuid = crypto.randomUUID() + ':' + crypto.randomUUID()
    apiHistory[uuid] = {
      route: targetPath || '/',
      method: data.method,
    }

    // Add a pending entry to recent requests at start
    recentRequests.unshift({
      id: uuid,
      method: data.method,
      route: targetPath || '/',
    })
    if (recentRequests.length > 10) recentRequests.pop()

    try {
      const response = await fetch(targetUrl, fetchOptions)
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

      apiHistory[uuid].status = response.status

      const idx = recentRequests.findIndex((r) => r.id === uuid)
      if (idx !== -1) {
        const existing = recentRequests[idx]!
        recentRequests[idx] = {
          id: existing.id,
          method: existing.method,
          route: existing.route,
          status: response.status,
        }
      } else {
        recentRequests.unshift({
          id: uuid,
          method: data.method,
          route: targetPath || '/',
          status: response.status,
        })
        if (recentRequests.length > 10) recentRequests.pop()
      }

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

      apiHistory[uuid].status = 500

      const idx = recentRequests.findIndex((r) => r.id === uuid)
      if (idx !== -1) {
        const existing = recentRequests[idx]!
        recentRequests[idx] = {
          id: existing.id,
          method: existing.method,
          route: existing.route,
          status: 500,
        }
      } else {
        recentRequests.unshift({
          id: uuid,
          method: data.method,
          route: targetPath || '/',
          status: 500,
        })
        if (recentRequests.length > 10) recentRequests.pop()
      }

      return errorResponse
    }
  }
}

export default ReqMessageService
