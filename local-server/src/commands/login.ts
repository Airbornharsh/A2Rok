import open from 'open'
import AuthApi from '../apis/auth'
import { FRONTEND_URL } from '../config/config'
import Session from '../utils/session'

const loginCommand = async () => {
  const sessionRes = await AuthApi.createSession()
  if (!sessionRes.success || !sessionRes.token || !sessionRes.sessionId) {
    console.error(`Failed to create session`)
    return
  }

  open(`${FRONTEND_URL}/terminal?token=${sessionRes.token}`)
  console.log(`Opening ${FRONTEND_URL}/terminal?token=${sessionRes.token}`)

  const currentTime = Date.now()
  const timeout = 1000 * 60 * 5 // 5 minutes
  const endTime = currentTime + timeout

  let sessionId = sessionRes.sessionId

  while (Date.now() < endTime) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const data = await AuthApi.checkSession(sessionId)

    if (data.valid) {
      if (data.valid === 'active') {
        if (data.token) {
          Session.setSession({
            email: data.email,
            token: data.token,
          })
          console.log(`Logged in successfully with email ${data.email}`)
          break
        } else {
          console.log(`Try Again Later`)
          break
        }
      } else if (data.valid === 'expired') {
        console.log(`Session expired`)
        break
      } else if (data.valid === 'deleted') {
        console.log(`Session deleted`)
        break
      }
    }
  }
}

export default loginCommand
