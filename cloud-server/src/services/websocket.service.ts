import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { db } from '../db/mongo/init'
import DomainService from './domain.service'
import JwtService from './jwt.service'
import { SubdomainResponse } from '../types/instance'
import CompressionService from './compression.service'

interface UserConnection {
  userId: string
  domain: string
  port: number
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
  private pendingResponseStorage: Map<string, SubdomainResponse | null> =
    new Map()
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

  // Handle new WebSocket connection
  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    const url = new URL(request.url, `http://${request.headers.host}`)
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

      let domainData
      let domain = url.searchParams.get('domain')

      if (domain) {
        domainData = await db?.DomainModel.findOne({ domain, userId }).lean()
      } else {
        domainData = await db?.DomainModel.findOne({ userId }).lean()
        if (!domainData) {
          domainData = await DomainService.createDomain(userId)
          if (!domainData) {
            ws.close(1008, 'Failed to create domain')
            return
          }
        }
        domain = domainData.domain
      }

      if (!domain) {
        ws.close(1008, 'Failed to get domain')
        return
      }

      console.log(`\n🔐 Authenticated user: ${user.email} (${domain})`)

      // Check if user already has a connection
      const existingConnection = this.domainConnections.get(domain)
      if (existingConnection) {
        console.log(`🔄 Replacing existing connection for user: ${userId}`)
        if (existingConnection.ws.readyState === WebSocket.OPEN) {
          existingConnection.ws.close(1000, 'New connection established')
        }
      }

      const connection: UserConnection = {
        userId,
        domain,
        port: Number(url.searchParams.get('port')),
        ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      }

      // Store connection by domain and update user domains
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

      ws.on('close', () => {
        this.handleDisconnection(userId, domain)
      })

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for user ${userId}:`, error)
        this.handleDisconnection(userId, domain)
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

    this.pendingResponseStorage.set(pendingResponseId, null)

    this.increaseDomainTtl(subdomain)
    this.increaseDomainOpn(subdomain)

    domainConnection.ws.send(
      CompressionService.compressMessage({
        type: 'subdomain_request',
        data: {
          pendingResponseId: pendingResponseId,
          domain: subdomain,
          port: domainConnection.port,
          headers: req.headers,
          body: req.body,
          query: req.query,
          params: req.params,
          path: req.path,
          method: req.method,
          url: req.url,
          protocol: req.protocol,
          secure: req.secure,
          hostname: req.hostname,
          ip: req.ip,
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
    if (!this.pendingResponseStorage.has(pendingResponseId)) {
      console.error(`❌ No pending response found for ID: ${pendingResponseId}`)
      return
    }

    this.pendingResponseStorage.set(pendingResponseId, data)
  }

  public getStoredResponse(
    pendingResponseId: string,
  ): SubdomainResponse | null {
    return this.pendingResponseStorage.get(pendingResponseId) || null
  }

  public consumeStoredResponse(
    pendingResponseId: string,
  ): SubdomainResponse | null {
    const responseData = this.pendingResponseStorage.get(pendingResponseId)
    if (responseData !== null && responseData !== undefined) {
      this.pendingResponseStorage.delete(pendingResponseId)
      return responseData
    }
    return null
  }

  public deleteStoredResponse(pendingResponseId: string): void {
    this.pendingResponseStorage.delete(pendingResponseId)
  }

  public hasStoredResponse(pendingResponseId: string): boolean {
    const responseData = this.pendingResponseStorage.get(pendingResponseId)
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
    this.pendingResponseStorage.clear()

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

    this.wss?.close()
    this.server?.close()

    console.log('WebSocket server shutdown')
  }
}

export default WebSocketService.getInstance()
