import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage, Server } from 'http'
import { db } from '../db/mongo/init'
import DomainService from './domain.service'
import JwtService from './jwt.service'
import { SubdomainResponse } from '../types/instance'
import CompressionService from './compression.service'
import Cache from './cache.service'

interface UserConnection {
  userId: string
  domain: string
  port: number
  protocol: string
  link?: string
  ws: WebSocket
  connectedAt: Date
  lastActivity: Date
  user?: {
    _id: string
    name: string
    email: string
  }
}

export class WebSocketService {
  private static instance: WebSocketService
  private wss: WebSocketServer | null = null
  // userId -> domains[]
  private userDomains: Map<string, string[]> = new Map()
  // domain -> connection
  private domainConnections: Map<string, UserConnection> = new Map()
  private domainMetadataStorage: Map<
    string,
    {
      ttl: number
      opn: number
    }
  > = new Map()

  // pendingResponseId -> data: null | responseData
  private pendingHttpResponseStorage: Map<string, SubdomainResponse | null> =
    new Map()

  // domain -> boolean
  private pendingDomainWsTunnel: Map<string, boolean> = new Map()
  // domain -> ws
  private domainWsTunnelConnection: Map<string, WebSocket> = new Map()
  private server: Server | null = null

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  public initialize(server: Server, path: string = '/ws'): void {
    this.server = server
    this.wss = new WebSocketServer({
      server: server,
      path: path,
    })

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleConnection(ws, request)
    })

    console.log(`🔌 WebSocket server initialized on path: ${path}`)
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const forwardedHost =
      request.headers['x-forwarded-host'] || request.headers['x-original-host']
    const rawHost = (forwardedHost || request.headers['host'] || '')
      .toString()
      .trim()

    const hostCandidate = rawHost.split(',')[0].trim()
    if (!hostCandidate) {
      this.handleServerConnection(ws, request)
      return
    }

    const host = hostCandidate.replace(/:\d+$/, '')

    const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
    const isIPv6 = host.includes(':') && host.split(':').length > 2
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      isIPv4 ||
      isIPv6
    ) {
      this.handleServerConnection(ws, request)
      return
    }

    const BASE_DOMAINS = [
      'a2rok-server.harshkeshri.com',
      'a2rok.onrender.com',
      'localhost',
    ]

    if (BASE_DOMAINS.includes(host)) {
      this.handleServerConnection(ws, request)
      return
    }

    let subdomain: string | null = null
    for (const base of BASE_DOMAINS) {
      if (host.endsWith('.' + base)) {
        const left = host.slice(0, host.length - (base.length + 1))
        subdomain = left.split('.')[0]
        break
      }
    }

    if (!subdomain) {
      this.handleServerConnection(ws, request)
      return
    }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(subdomain)) {
      this.handleServerConnection(ws, request)
      return
    }

    if (
      subdomain &&
      subdomain !== 'localhost' &&
      subdomain !== '127.0.0.1' &&
      !subdomain.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      this.handleTunnelConnection(ws, request, subdomain)
      return
    }
  }

  // Handle new WebSocket connection
  private async handleServerConnection(
    ws: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(1008, 'Missing authentication token')
      return
    }

    try {
      const decodedToken = await JwtService.decodeToken(token)
      if (!decodedToken || !decodedToken.email) {
        ws.close(1008, 'Invalid authentication token')
        return
      }
      const user = await db?.UserModel.findOne({
        email: decodedToken.email,
      })
      if (!user || !user._id) {
        ws.close(1008, 'User not found')
        return
      }

      const userId = (user as any)._id.toString()

      const requestedDomain = url.searchParams.get('domain') || undefined

      const userDomains = (await db?.DomainModel.find({ userId })
        .lean()
        .exec()) as Array<{ domain: string }> | undefined

      let domain: string | null = null

      if (requestedDomain) {
        const owned = userDomains?.some((d) => d.domain === requestedDomain)
        if (!owned) {
          ws.close(1008, 'Requested domain not found for this user')
          return
        }
        if (this.domainConnections.has(requestedDomain)) {
          const alternative = userDomains?.find(
            (d) => !this.domainConnections.has(d.domain),
          )
          if (alternative) {
            domain = alternative.domain
          } else {
            ws.close(1008, 'Requested domain is already connected')
            return
          }
        } else {
          domain = requestedDomain
        }
      } else {
        if (userDomains && userDomains.length > 0) {
          const available = userDomains.find(
            (d) => !this.domainConnections.has(d.domain),
          )
          if (available) {
            domain = available.domain
          } else {
            ws.close(1008, 'All domains for this user are already connected')
            return
          }
        } else {
          const created = await DomainService.createDomain(userId)
          if (!created) {
            ws.close(1008, 'Failed to create domain')
            return
          }
          domain = created.domain
        }
      }

      if (!domain) {
        ws.close(1008, 'Failed to resolve domain')
        return
      }

      console.log(`\n🔐 Authenticated user: ${user.email} (${domain})`)

      const connection: UserConnection = {
        userId,
        domain,
        port: Number(url.searchParams.get('port')),
        protocol: url.searchParams.get('protocol') || 'http',
        link: url.searchParams.get('link') || undefined,
        ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      }

      // Store connection by domain and update user domains (do not replace existing)
      this.domainConnections.set(domain, connection)

      // Update user domains mapping
      if (this.userDomains.has(userId)) {
        const domains = this.userDomains.get(userId)!
        if (!domains.includes(domain)) {
          domains.push(domain)
        }
      } else {
        this.userDomains.set(userId, [domain])
      }

      console.log(
        `🔗 New authenticated WebSocket connection for user: ${userId}`,
      )

      // Send connection confirmation with the chatId and user info
      this.sendToUser(userId, domain, 'connection_established', {
        userId,
        user: connection.user,
        domain: domain,
        timestamp: new Date().toISOString(),
      })

      // Handle connection events
      ws.on('message', (data) => {
        this.handleMessage(userId, domain, data)
      })

      const heartbeatInterval = setInterval(() => {
        const conn = this.domainConnections.get(domain)
        if (conn && conn.userId === userId) {
          conn.lastActivity = new Date()
          this.sendToUser(userId, domain, 'heartbeat', {
            timestamp: new Date().toISOString(),
          })
        }
      }, 10000)

      ws.on('close', () => {
        this.handleDisconnection(userId, domain)
        clearInterval(heartbeatInterval)
      })

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for user ${userId}:`, error)
        this.handleDisconnection(userId, domain)
        clearInterval(heartbeatInterval)
      })

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        const conn = this.domainConnections.get(domain)
        if (conn && conn.userId === userId) {
          conn.lastActivity = new Date()
        }
      })
    } catch (error) {
      console.error('❌ WebSocket authentication error:', error)
      ws.close(1008, 'Authentication failed')
      return
    }
  }

  // Handle incoming messages from clients
  private async handleMessage(
    userId: string,
    domain: string,
    data: any,
  ): Promise<void> {
    try {
      const message = CompressionService.decompressMessage(data)
      const connection = this.domainConnections.get(domain)

      if (!connection || connection.userId !== userId) return

      connection.lastActivity = new Date()

      switch (message.type) {
        case 'ping':
          this.sendToUser(userId, domain, 'pong', {
            timestamp: new Date().toISOString(),
          })
          break
        case 'disconnect':
          console.log(`👋 Manual disconnect received from user ${userId}`)
          this.handleDisconnection(userId, domain)
          break
        case 'subdomain_response':
          this.passResponse(message.data)
          break
        case 'ws_outgoing_message':
          this.handleWsOutgoingMessage(message.data)
          break
        default:
          console.log(`📨 Received message from user ${userId}:`, message)
      }
    } catch (error) {
      console.error(`❌ Error handling message from user ${userId}:`, error)
    }
  }

  private handleDisconnection(userId: string, domain: string): void {
    const connection = this.domainConnections.get(domain)
    if (!connection || connection.userId !== userId) return

    // Remove from domain connections
    this.domainConnections.delete(domain)

    // Remove from user domains
    const userDomains = this.userDomains.get(userId)
    if (userDomains) {
      const index = userDomains.indexOf(domain)
      if (index > -1) {
        userDomains.splice(index, 1)
      }
      // If no more domains for this user, remove the user entry
      if (userDomains.length === 0) {
        this.userDomains.delete(userId)
      }
    }

    if (this.domainMetadataStorage.has(domain)) {
      this.domainMetadataStorage.delete(domain)
    }

    if (this.pendingDomainWsTunnel.has(domain)) {
      this.pendingDomainWsTunnel.delete(domain)
    }

    const wsTunnelConnection = this.domainWsTunnelConnection.get(domain)
    if (wsTunnelConnection) {
      wsTunnelConnection.close()
      this.domainWsTunnelConnection.delete(domain)
    }

    console.log(`🔌 WebSocket disconnected for user: ${userId} ${domain}`)
  }

  public sendToUser(
    userId: string,
    domain: string,
    type: string,
    data: any,
  ): void {
    try {
      const connection = this.domainConnections.get(domain)
      if (
        !connection ||
        connection.userId !== userId ||
        connection.ws.readyState !== WebSocket.OPEN
      ) {
        console.log(`❌ User ${domain} not connected or WebSocket not open`)
        return
      }

      try {
        connection.ws.send(
          CompressionService.compressMessage({
            type: type,
            data: data,
          }),
        )
      } catch (error) {
        console.error(`❌ Error sending message to user ${domain}:`, error)
        this.handleDisconnection(userId, domain)
      }
    } catch {}
  }

  public passRequest(
    userId: string,
    subdomain: string,
    pendingResponseId: string,
    req: any,
  ): void {
    const domainConnection = this.domainConnections.get(subdomain)
    if (!domainConnection || domainConnection.userId !== userId) {
      throw new Error('Domain not connected or user mismatch')
    }

    this.pendingHttpResponseStorage.set(pendingResponseId, null)

    this.increaseDomainTtl(subdomain)
    this.increaseDomainOpn(subdomain)

    domainConnection.ws.send(
      CompressionService.compressMessage({
        type: 'subdomain_request',
        data: {
          pendingResponseId: pendingResponseId,
          domain: subdomain,
          port: domainConnection.port,
          protocol: domainConnection.protocol,
          link: domainConnection.link,
          headers: req.preservedHeaders || req.headers,
          rawBody: req.rawBody,
          body: req.body,
          query: req.query,
          params: req.params,
          path: req.path,
          method: req.method,
          url: req.fullUrl || req.url,
          reconstructedPath: req.reconstructedPath,
          originalProtocol: req.originalProtocol || req.protocol,
          secure:
            req.originalSecure !== undefined ? req.originalSecure : req.secure,
          hostname: req.hostname,
          ip: req.ip,
          originalHost: req.originalHost,
          timestamp: req.timestamp,
        },
      }),
    )
  }

  public passResponse(data: SubdomainResponse): void {
    const { pendingResponseId } = data

    if (!pendingResponseId) {
      console.error('❌ No pendingResponseId in response data')
      return
    }

    // Check if we have a pending response for this ID
    if (!this.pendingHttpResponseStorage.has(pendingResponseId)) {
      console.error(`❌ No pending response found for ID: ${pendingResponseId}`)
      return
    }

    this.pendingHttpResponseStorage.set(pendingResponseId, data)
  }

  public getStoredResponse(
    pendingResponseId: string,
  ): SubdomainResponse | null {
    return this.pendingHttpResponseStorage.get(pendingResponseId) || null
  }

  public consumeStoredResponse(
    pendingResponseId: string,
  ): SubdomainResponse | null {
    const responseData = this.pendingHttpResponseStorage.get(pendingResponseId)
    if (responseData !== null && responseData !== undefined) {
      this.pendingHttpResponseStorage.delete(pendingResponseId)
      return responseData
    }
    return null
  }

  public deleteStoredResponse(pendingResponseId: string): void {
    this.pendingHttpResponseStorage.delete(pendingResponseId)
  }

  public hasStoredResponse(pendingResponseId: string): boolean {
    const responseData = this.pendingHttpResponseStorage.get(pendingResponseId)
    return responseData !== null && responseData !== undefined
  }

  public increaseDomainTtl(domain: string): void {
    const metadata = this.domainMetadataStorage.get(domain)
    if (metadata) {
      metadata.ttl++
    } else {
      this.domainMetadataStorage.set(domain, { ttl: 1, opn: 0 })
    }

    this.pushDomainMetadata(domain)
  }

  public increaseDomainOpn(domain: string): void {
    const metadata = this.domainMetadataStorage.get(domain)
    if (metadata) {
      metadata.opn++
    } else {
      this.domainMetadataStorage.set(domain, { ttl: 0, opn: 1 })
    }

    this.pushDomainMetadata(domain)
  }

  public decreaseDomainOpn(domain: string): void {
    const metadata = this.domainMetadataStorage.get(domain)
    if (metadata) {
      metadata.opn--
    }

    this.pushDomainMetadata(domain)
  }

  public getDomainMetadata(domain: string): { ttl: number; opn: number } {
    return this.domainMetadataStorage.get(domain) || { ttl: 0, opn: 0 }
  }

  public pushDomainMetadata(domain: string): void {
    const connection = this.domainConnections.get(domain)
    const metadata = this.domainMetadataStorage.get(domain)
    if (connection) {
      connection.ws.send(
        CompressionService.compressMessage({
          type: 'domain_metadata',
          data: {
            ttl: metadata?.ttl || 0,
            opn: metadata?.opn || 0,
          },
        }),
      )
    }
  }

  public isUserConnected(userId: string): boolean {
    const userDomains = this.userDomains.get(userId)
    if (!userDomains) return false

    for (const domain of userDomains) {
      const connection = this.domainConnections.get(domain)
      if (
        connection &&
        connection.userId === userId &&
        connection.ws.readyState === WebSocket.OPEN
      ) {
        return true
      }
    }
    return false
  }

  public shutdown(): void {
    // Clean up all pending responses
    this.pendingHttpResponseStorage.clear()

    // Close all domain connections
    this.domainConnections.forEach((connection, domain) => {
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Server shutdown')
        this.handleDisconnection(connection.userId, domain)
      }
    })

    // Clear all mappings
    this.domainConnections.clear()
    this.userDomains.clear()
    this.domainMetadataStorage.clear()
    this.pendingDomainWsTunnel.clear()
    this.domainWsTunnelConnection.clear()

    this.wss?.close()
    this.server?.close()

    console.log('WebSocket server shutdown')
  }

  private async handleTunnelConnection(
    ws: WebSocket,
    request: IncomingMessage,
    subdomain: string,
  ): Promise<void> {
    if (!request.url) {
      ws.close(1008, 'Missing URL')
      return
    }
    const queries = request.url.split('?')[1]

    if (!this.domainConnections.has(subdomain)) {
      ws.close(1008, 'Domain not connected')
      return
    }

    const cacheKey = `domain:${subdomain}`
    let domain: any = Cache.get(cacheKey)
    if (!domain) {
      domain = await db?.DomainModel.findOne({ domain: subdomain }).lean()
      if (domain) {
        Cache.set(cacheKey, domain, 60_000)
      }
    }
    if (!domain) {
      ws.close(1008, 'Domain not found')
      return
    }

    const existingConnection = this.domainConnections.get(subdomain)

    if (!existingConnection) {
      ws.close(1008, 'Domain not connected')
      return
    }
    if (existingConnection) {
      if (existingConnection.ws.readyState !== WebSocket.OPEN) {
        ws.close(1008, 'Domain not connected')
        return
      }
      if (existingConnection.userId !== domain.userId.toString()) {
        ws.close(1008, 'Domain not connected')
        return
      }
      if (!existingConnection.link) {
        ws.close(1008, 'Link not found')
        return
      }
    }

    if (this.pendingDomainWsTunnel.has(subdomain)) {
      ws.close(1008, 'Domain already connecting')
      return
    }

    this.pendingDomainWsTunnel.set(subdomain, true)
    this.domainWsTunnelConnection.set(subdomain, ws)

    ws.on('close', () => {
      this.pendingDomainWsTunnel.delete(subdomain)
      this.domainWsTunnelConnection.delete(subdomain)
    })

    ws.on('error', (error) => {
      console.error('❌ Error handling tunnel connection:', error)
      this.pendingDomainWsTunnel.delete(subdomain)
      this.domainWsTunnelConnection.delete(subdomain)
    })

    this.sendToUser(
      domain.userId.toString(),
      subdomain,
      'pending_incoming_ws_connection',
      {
        domain: subdomain,
        url: existingConnection.link + (queries ? '?' + queries : ''),
        // headers: request.headers,
        timestamp: new Date().toISOString(),
      },
    )

    const timeoutMs = 2 * 60000 // 1 minute
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      if (!this.pendingDomainWsTunnel.has(subdomain)) {
        break
      }
      if (this.pendingDomainWsTunnel.get(subdomain) !== null) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (this.pendingDomainWsTunnel.get(subdomain) === null) {
      ws.close(1008, 'Domain connection timed out')
      return
    }

    this.pendingDomainWsTunnel.delete(subdomain)

    ws.on('message', (data) => {
      WebSocketService.getInstance().sendToUser(
        domain.userId.toString(),
        subdomain,
        'ws_incoming_message',
        {
          messageData: data.toString(),
          timestamp: new Date().toISOString(),
        },
      )
    })
  }

  private handleWsOutgoingMessage(data: any): void {
    const { messageData, domain } = data
    const existingConnection = this.domainWsTunnelConnection.get(domain)
    if (existingConnection) {
      existingConnection.send(messageData)
    } else {
      console.error('❌ Error sending message to user:', messageData)
    }
  }
}

export default WebSocketService.getInstance()
