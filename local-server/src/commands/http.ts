import connectWebSocket, { wsConnectionState } from '../apis/websocket'
import MessageService from '../services/message.service'
import Session from '../utils/session'

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
  const session = await Session.getSession()
  if (!session) {
    console.error('Session not found')
    return null
  }
  await connectWebSocket(port, session.token)

  const domain = 'shkfc-sfvujsbfnvol'

  process.stdout.write('\x1Bc')
  process.stdout.write('\x1b[0;0H')

  console.log('Press Ctrl + C to exit.')

  setInterval(() => {
    const domainMetadata = MessageService.getDomainMetadata()

    process.stdout.write('\x1Bc')
    process.stdout.write('\x1b[0;0H')

    // Header
    console.log(
      '\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m',
    )
    console.log(
      '\x1b[1m\x1b[36m║                              A2Rok                              ║\x1b[0m',
    )
    console.log(
      '\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m',
    )
    console.log('')

    // Session Status Details
    console.log('\x1b[1m\x1b[33mSession Status Details:\x1b[0m')
    console.log(`\x1b[32mSession Status:\x1b[0m \x1b[1m\x1b[32monline\x1b[0m`)
    console.log(
      `\x1b[37mAccount:\x1b[0m ${session.email} \x1b[90m(Plan: Free)\x1b[0m`,
    )
    console.log(`\x1b[37mVersion:\x1b[0m 3.19.0`)
    console.log(
      `\x1b[37mForwarding:\x1b[0m \x1b[34mhttps://${domainMetadata.domain}.a2rok-server.harshkeshri.com\x1b[0m \x1b[90m->\x1b[0m \x1b[34mhttp://localhost:${port}\x1b[0m`,
    )
    console.log('')

    // Connections Table
    console.log('\x1b[1m\x1b[33mConnections:\x1b[0m')
    console.log('\x1b[90m┌─────┬─────┐\x1b[0m')
    console.log(
      '\x1b[90m│\x1b[0m \x1b[1mttl\x1b[0m \x1b[90m│\x1b[0m \x1b[1mopn\x1b[0m \x1b[90m│\x1b[0m',
    )
    console.log('\x1b[90m├─────┼─────┤\x1b[0m')
    console.log(
      `\x1b[90m│\x1b[0m ${domainMetadata.ttl.toString().padStart(3)} \x1b[90m│\x1b[0m ${domainMetadata.opn.toString().padStart(3)} \x1b[90m│\x1b[0m`,
    )
    console.log('\x1b[90m└─────┴─────┘\x1b[0m')
    console.log('')

    // Footer
    console.log('\x1b[90mPress \x1b[1mCtrl + C\x1b[0m \x1b[90mto exit.\x1b[0m')
  }, 1000)

  process.on('SIGINT', () => {
    process.stdout.write('\x1Bc')
    console.log('\n🛑 Shutting down ...')
    process.exit(0)
  })
}

export default httpCommand
