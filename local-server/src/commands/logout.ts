import Session from '../utils/session'

const logoutCommand = async () => {
  await Session.deleteSession()
  console.log(`Logged out successfully`)
}

export default logoutCommand
