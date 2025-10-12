import connectWebSocket, { wsConnectionState } from '../apis/websocket'
import MessageService from '../services/message.service'

const httpCommand = async (args: string[]) => {
  const portValue = args[3]
  if (!portValue) {
    console.error('Port is required')
    process.exit(1)
  }
  const port = Number(portValue)
  if (isNaN(port)) {
    console.error('Port is not a number')
    process.exit(1)
  }
  await connectWebSocket(port)

  process.stdout.write('\x1Bc')
  process.stdout.write('\x1b[0;0H')

  console.log('🔵 Full terminal occupied by Node.js!')
  console.log('Press Ctrl + C to exit.')
  console.log(`🚀 HTTP server running on port ${port}`)

  setInterval(() => {
    const domainMetadata = MessageService.getDomainMetadata()

    process.stdout.write('\x1Bc')
    console.log('📟 Current Time:', new Date().toLocaleTimeString())
    console.log('🔵 Full terminal occupied by Node.js!')
    console.log(`🚀 HTTP server running on port ${port}`)
    console.log(
      `🔌 WebSocket: ${wsConnectionState.connected ? '✅ Connected' : '❌ Disconnected'}`,
    )
    console.log(`📨 Last message: ${wsConnectionState.lastMessage}`)
    console.log('')
    console.log('📊 Domain Statistics:')
    console.log(`   🎯 TTL (Time To Live): ${domainMetadata.ttl}`)
    console.log(`   🔗 OPN (Open Connections): ${domainMetadata.opn}`)
    console.log('')
    console.log('Press Ctrl + C to exit.')
  }, 1000)

  process.on('SIGINT', () => {
    process.stdout.write('\x1Bc')
    console.log('\n🛑 Shutting down HTTP server...')
    process.exit(0)
  })
}

export default httpCommand
