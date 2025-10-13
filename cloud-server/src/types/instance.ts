export interface SubdomainRequest {
  pendingResponseId: string
  domain: string
  port: number
  headers: Record<string, string>
  body: any
  query: Record<string, string>
  params: Record<string, string>
  path: string
  method: string
  url: string
  protocol: string
  secure: boolean
  hostname: string
  ip: string
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
