import { RawData, WebSocket } from 'ws'
import { PendingWsConnection } from '../types/instance'
import CompressionService from './compression.service'

class WsMessageService {
  private static instance: WsMessageService
  private ws: WebSocket | null = null
  private cloudWs: WebSocket | null = null
  private url: string | null = null
  private domain: string | null = null
  private recentMessages: Array<{
    direction: 'IN' | 'OUT'
    timestamp: string
    length: number
    message: string
  }> = []

  private constructor() {}

  public static getInstance() {
    if (!WsMessageService.instance) {
      WsMessageService.instance = new WsMessageService()
    }
    return WsMessageService.instance
  }

  public getRecentMessages() {
    return this.recentMessages.slice(-10)
  }

  async handlePendingIncomingWsConnection(
    data: PendingWsConnection,
    cloudWs: WebSocket,
  ) {
    const url = data.url
    const domain = data.domain
    WsMessageService.getInstance().url = url
    WsMessageService.getInstance().domain = domain
    WsMessageService.getInstance().cloudWs = cloudWs

    WsMessageService.getInstance().handleConnection(url, cloudWs)
  }

  private handleConnection(url: string, cloudWs: WebSocket) {
    // Close any existing local connection first
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close(1000, 'Reconnecting')
      } catch {}
    }

    const localWs = new WebSocket(url)
    ;(localWs as any).binaryType = 'arraybuffer'

    this.ws = localWs

    localWs.on('open', () => {
      console.log('Local WebSocket connection established')
    })

    localWs.on('message', (event) => {
      this.handleMessage(event, cloudWs)
    })

    localWs.on('close', () => {
      this.handleDisconnection()
    })

    localWs.on('error', () => {
      this.handleDisconnection()
    })
  }

  private handleMessage(data: RawData, cloudWs: WebSocket) {
    if (!cloudWs || cloudWs.readyState !== WebSocket.OPEN) return
    const domain = WsMessageService.getInstance().domain
    // record outgoing message
    const messageStr = typeof data === 'string' ? data : data.toString()
    this.recentMessages.push({
      direction: 'OUT',
      timestamp: new Date().toISOString(),
      length: Buffer.byteLength(messageStr),
      message: messageStr,
    })
    if (this.recentMessages.length > 50) {
      this.recentMessages.splice(0, this.recentMessages.length - 50)
    }
    cloudWs.send(
      CompressionService.compressMessage({
        type: 'ws_outgoing_message',
        data: {
          messageData: data.toString(),
          domain,
          timestamp: new Date().toISOString(),
        },
      }),
    )
  }

  public handleWsIncomingMessage(data: any) {
    const ws = WsMessageService.getInstance().ws
    if (!ws) return

    const { messageData } = data

    const messageStr =
      typeof messageData === 'string' ? messageData : messageData
    this.recentMessages.push({
      direction: 'IN',
      timestamp: new Date().toISOString(),
      length: Buffer.byteLength(messageStr),
      message: messageStr,
    })
    if (this.recentMessages.length > 50) {
      this.recentMessages.splice(0, this.recentMessages.length - 50)
    }
    ws.send(messageData)
  }

  private handleDisconnection() {
    if (this.ws) {
      try {
        this.ws.close()

        // if (this.cloudWs) {
        //   this.cloudWs.close(1000, 'Disconnected')
        // }
      } catch {}
      this.ws = null
    }
  }
}

export default WsMessageService
