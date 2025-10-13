import { WSS_BACKEND_URL } from '../config/config'
import CompressionService from '../services/compression.service'
import MessageService from '../services/message.service'
import Session from '../utils/session'

// Global state for WebSocket connection
let wsConnectionState = {
  connected: false,
  lastMessage: 'Waiting for connection...',
}

const connectWebSocket = async (port: number): Promise<WebSocket | null> => {
  const session = await Session.getSession()
  if (!session) {
    console.error('Session not found')
    return null
  }

  wsConnectionState.lastMessage = 'Connecting to WebSocket server...'

  const ws = new WebSocket(
    `${WSS_BACKEND_URL}?token=${session.token}&port=${port}`,
  )

  // Ensure we receive binary frames for compressed messages
  ;(ws as any).binaryType = 'arraybuffer'

  ws.onopen = () => {
    wsConnectionState.connected = true
    wsConnectionState.lastMessage = 'WebSocket connected successfully'
  }

  ws.onmessage = async (event) => {
    try {
      let binary: Buffer
      if (event.data instanceof ArrayBuffer) {
        binary = Buffer.from(new Uint8Array(event.data))
      } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
        const ab = await event.data.arrayBuffer()
        binary = Buffer.from(new Uint8Array(ab))
      } else if (Buffer.isBuffer(event.data)) {
        binary = event.data
      } else {
        binary = Buffer.from(event.data)
      }

      const message = CompressionService.decompressMessage(binary)
      wsConnectionState.lastMessage = `Received: ${message.type}`
      MessageService.handleRequestMessage(message, ws)
    } catch (error) {
      wsConnectionState.lastMessage = `Message error: ${error}`
      ws.close(1008, 'WebSocket message error')
    }
  }

  ws.onclose = (ev) => {
    wsConnectionState.connected = false
    wsConnectionState.lastMessage = `Connection closed: ${ev.code} ${ev.reason}`

    // Exit when disconnected instead of reconnecting
    console.log('\n🔌 WebSocket connection lost. Exiting...')
    process.exit(1)
  }

  ws.onerror = (event) => {
    wsConnectionState.connected = false
    wsConnectionState.lastMessage = 'WebSocket connection error'

    // Exit on WebSocket error
    console.log('\n❌ WebSocket error occurred. Exiting...')
    process.exit(1)
  }

  return ws
}

// Export the connection state for the main process to access
export { wsConnectionState }

export default connectWebSocket
