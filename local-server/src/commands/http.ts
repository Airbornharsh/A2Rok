import connectWebSocket from '../apis/websocket'
import MessageService from '../services/message.service'
import ReqMessageService from '../services/reqMessage.service'
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

    const recent = ReqMessageService.getRecentRequests()
    console.log('\x1b[1m\x1b[33mRecent Requests:\x1b[0m')

    const termWidth = Math.max(40, process.stdout.columns || 80)
    const mthWidth = 5
    const stsWidth = 3
    const fixedOverhead = 2 /*│ */ + 3 /* │ */ + 3 /* │ */ + 2 /* │*/
    let routeWidth = termWidth - fixedOverhead - mthWidth - stsWidth
    if (routeWidth < 10) routeWidth = 10

    const grey = '\x1b[90m'
    const reset = '\x1b[0m'

    const top = `${grey}┌${'─'.repeat(mthWidth + 2)}┬${'─'.repeat(routeWidth + 2)}┬${'─'.repeat(stsWidth + 2)}┐${reset}`
    const sep = `${grey}├${'─'.repeat(mthWidth + 2)}┼${'─'.repeat(routeWidth + 2)}┼${'─'.repeat(stsWidth + 2)}┤${reset}`
    const bot = `${grey}└${'─'.repeat(mthWidth + 2)}┴${'─'.repeat(routeWidth + 2)}┴${'─'.repeat(stsWidth + 2)}┘${reset}`

    console.log(top)
    const header = `${grey}│${reset} \x1b[1mMTH\x1b[0m${' '.repeat(mthWidth - 3)} ${grey}│${reset} \x1b[1mROUTE\x1b[0m${' '.repeat(Math.max(0, routeWidth - 5))} ${grey}│${reset} \x1b[1mSTS\x1b[0m ${grey}│${reset}`
    console.log(header)
    console.log(sep)

    if (recent.length === 0) {
      const emptyMsg = '(no requests yet)'
      const routeCell = (
        emptyMsg + ' '.repeat(Math.max(0, routeWidth - emptyMsg.length))
      ).slice(0, routeWidth)
      console.log(
        `${grey}│${reset} ${' '.repeat(mthWidth)} ${grey}│${reset} ${routeCell} ${grey}│${reset} ${' '.repeat(stsWidth)} ${grey}│${reset}`,
      )
    } else {
      for (const r of recent) {
        const method = (r.method || '')
          .toString()
          .padEnd(mthWidth)
          .slice(0, mthWidth)
        const route = (r.route || '/')
          .toString()
          .padEnd(routeWidth)
          .slice(0, routeWidth)
        const pending = r.status === undefined
        const statusText = pending
          ? '⏳'
          : (r.status ?? '-').toString().padStart(stsWidth)
        const statusColor = pending
          ? '\x1b[33m'
          : r.status && r.status >= 200 && r.status < 300
            ? '\x1b[32m'
            : r.status && r.status >= 400
              ? '\x1b[31m'
              : '\x1b[37m'
        console.log(
          `${grey}│${reset} ${method} ${grey}│${reset} ${route} ${grey}│${reset} ${statusColor}${statusText}${reset} ${grey}│${reset}`,
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

export default httpCommand
