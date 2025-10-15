import connectWebSocket from '../apis/websocket'
import MessageService from '../services/message.service'
import ReqMessageService from '../services/reqMessage.service'
import WsMessageService from '../services/wsMessage.service'
import Session from '../utils/session'

const wssCommand = async (args: string[]) => {
  const linkValue = args[3]

  if (!linkValue) {
    console.error('Link is required for WSS. Usage: a2rok wss <link>')
    console.error('Example: a2rok wss wss://localhost:8080')
    process.exit(1)
  }

  // Validate that the link starts with wss://
  if (!linkValue.startsWith('wss://')) {
    console.error('Link must start with wss:// for WebSocket Secure tunneling')
    console.error('Example: a2rok wss wss://localhost:8080')
    process.exit(1)
  }

  const session = await Session.getSession()
  if (!session) {
    console.error('Session not found')
    return null
  }
  await connectWebSocket(0, session.token, 'wss', linkValue)

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
      '\x1b[1m\x1b[36m║                              A2Rok (WSS)                               ║\x1b[0m',
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
      `\x1b[37mForwarding:\x1b[0m \x1b[34mwss://${domainMetadata.domain}.a2rok-server.harshkeshri.com/ws-tunnel\x1b[0m \x1b[90m->\x1b[0m \x1b[34m${linkValue}\x1b[0m`,
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

    const recent = ReqMessageService.getRecentRequests()
    console.log('\x1b[1m\x1b[33mRecent WebSocket Secure Messages:\x1b[0m')

    const termWidth = Math.max(40, process.stdout.columns || 80)
    const typeWidth = 5 // Fixed: TYPE column
    const timeWidth = 8 // Fixed: TIME column
    const lenWidth = 4 // Fixed: LEN column
    const fixedOverhead =
      2 /*│ */ + 3 /* │ */ + 3 /* │ */ + 3 /* │ */ + 2 /* │*/
    const msgWidth = Math.max(
      20,
      termWidth - fixedOverhead - typeWidth - timeWidth - lenWidth,
    )

    const grey = '\x1b[90m'
    const reset = '\x1b[0m'

    const top = `${grey}┌${'─'.repeat(typeWidth + 2)}┬${'─'.repeat(timeWidth + 2)}┬${'─'.repeat(lenWidth + 2)}┬${'─'.repeat(msgWidth + 2)}┐${reset}`
    const sep = `${grey}├${'─'.repeat(typeWidth + 2)}┼${'─'.repeat(timeWidth + 2)}┼${'─'.repeat(lenWidth + 2)}┼${'─'.repeat(msgWidth + 2)}┤${reset}`
    const bot = `${grey}└${'─'.repeat(typeWidth + 2)}┴${'─'.repeat(timeWidth + 2)}┴${'─'.repeat(lenWidth + 2)}┴${'─'.repeat(msgWidth + 2)}┘${reset}`

    console.log(top)
    const header = `${grey}│${reset} \x1b[1mTYPE\x1b[0m${' '.repeat(typeWidth - 4)} ${grey}│${reset} \x1b[1mTIME\x1b[0m${' '.repeat(timeWidth - 4)} ${grey}│${reset} \x1b[1mLEN\x1b[0m ${grey}│${reset} \x1b[1mMESSAGE\x1b[0m${' '.repeat(Math.max(0, msgWidth - 7))} ${grey}│${reset}`
    console.log(header)
    console.log(sep)

    const wsRecent = WsMessageService.getInstance().getRecentMessages()
    if (wsRecent.length === 0) {
      const emptyMsg = '(no messages yet)'
      const timeCell = (
        emptyMsg + ' '.repeat(Math.max(0, timeWidth - emptyMsg.length))
      ).slice(0, timeWidth)
      console.log(
        `${grey}│${reset} ${' '.repeat(typeWidth)} ${grey}│${reset} ${timeCell} ${grey}│${reset} ${' '.repeat(lenWidth)} ${grey}│${reset} ${' '.repeat(msgWidth)} ${grey}│${reset}`,
      )
    } else {
      for (const r of wsRecent) {
        const method = (r.direction || 'WSS')
          .toString()
          .padEnd(typeWidth)
          .slice(0, typeWidth)
        const timeStr = new Date(r.timestamp).toLocaleTimeString()
        const time = timeStr.toString().padEnd(timeWidth).slice(0, timeWidth)
        const lenText = (r.length ?? '-').toString().padStart(lenWidth)
        const message = (r.message || '')
          .toString()
          .replace(/[\r\n]/g, ' ')
          .padEnd(msgWidth)
          .slice(0, msgWidth)
        const statusColor = '\x1b[37m'
        console.log(
          `${grey}│${reset} ${method} ${grey}│${reset} ${time} ${grey}│${reset} ${statusColor}${lenText}${reset} ${grey}│${reset} ${message} ${grey}│${reset}`,
        )
      }
    }
    console.log(bot)
    console.log('')

    // Footer
    console.log('\x1b[90mPress \x1b[1mCtrl + C\x1b[0m \x1b[90mto exit.\x1b[0m')
  }, 100)

  process.on('SIGINT', () => {
    process.stdout.write('\x1Bc')
    console.log('\n🛑 Shutting down ...')
    process.exit(0)
  })
}

export default wssCommand
