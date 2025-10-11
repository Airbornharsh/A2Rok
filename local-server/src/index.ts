const args = process.argv.slice(2)

switch (args[0]) {
  case 'user':
    console.log('User...')
    break
  case 'login':
    console.log('Login...')
    break
  case 'register':
    console.log('Register...')
    break
  case 'logout':
    console.log('Logout...')
    break
  case 'http':
    console.log('HTTP...')
    break
  case 'https':
    console.log('HTTPS...')
    break
  default:
    console.log('Invalid command')
    break
}
