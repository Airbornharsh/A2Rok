#!/usr/bin/env node
import loginCommand from './commands/login'
import userCommand from './commands/user'
import logoutCommand from './commands/logout'
import httpCommand from './commands/http'

const args = process.argv

const printHelp = () => {
  const help = `
Usage: a2rok <command> [options]

Commands:
  user                 Show the current authenticated user
  login                Sign in to A2Rok
  logout               Sign out of A2Rok
  http <port>          Expose a local HTTP server on <port>

Options:
  -h, --help           Show this help message

Examples:
  a2rok login
  a2rok user
  a2rok http 3000
`
  console.log(help)
}

const cmd = args[2]

switch (cmd) {
  case undefined:
    printHelp()
    break
  case 'help':
  case '--help':
  case '-h':
    printHelp()
    break
  case 'user':
    userCommand()
    break
  case 'login':
    loginCommand()
    break
  case 'logout':
    logoutCommand()
    break
  case 'http':
    httpCommand(args)
    break
  case 'https':
    console.log('HTTPS...')
    break
  default:
    console.log('Invalid command')
    printHelp()
    break
}
