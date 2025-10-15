export interface SubdomainRequest {
  pendingResponseId: string
  domain: string
  port: number
  protocol: string
  link?: string
  headers: Record<string, string>
  body: any
  query: Record<string, string>
  params: Record<string, string>
  path: string
  method: string
  url: string
  secure: boolean
  hostname: string
  ip: string
  rawBody?: string
  reconstructedPath?: string
  originalHost?: string
  originalProtocol?: string
  originalSecure?: boolean
  timestamp?: string
}

export interface SubdomainResponse {
  pendingResponseId: string
  domain: string
  port: number
  status: number
  statusText: string
  headers: Record<string, string>
  body: any
  contentType?: string
  isBase64?: boolean
}

export interface PendingWsConnection {
  domain: string
  url: string
  headers: Record<string, string>
  timestamp: string
}
