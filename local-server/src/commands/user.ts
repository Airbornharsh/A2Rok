import Session from '../utils/session'

const userCommand = async () => {
  const session = await Session.getSession()
  if (!session) {
    console.error(`No session found`)
    return
  }

  if (!session.email) {
    console.error(`No email found in session`)
    return
  }

  if (!session.token) {
    console.error(`No token found in session`)
    return
  }

  console.log(`User: ${session.email}`)
}

export default userCommand
