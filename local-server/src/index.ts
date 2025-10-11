import loginCommand from './commands/login'
import userCommand from './commands/user'
import logoutCommand from './commands/logout'
import httpCommand from './commands/http'

const args = process.argv.slice(2)

switch (args[0]) {
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
    httpCommand()
    break
  case 'https':
    console.log('HTTPS...')
    break
  default:
    console.log('Invalid command')
    break
}
