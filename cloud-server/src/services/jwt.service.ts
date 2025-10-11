import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/config'

class JwtService {
  static async generateToken(payload: { email: string; sessionId: string }) {
    const token = jwt.sign(payload, JWT_SECRET)
    return token
  }

  static async decodeToken(token: string): Promise<{
    email: string
    sessionId: string
  }> {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string
      sessionId: string
    }
    return decoded
  }
}

export default JwtService
