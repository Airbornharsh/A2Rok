import { BACKEND_URL } from '../config/config'

class AuthApi {
  static async createSession(): Promise<{
    success: boolean
    message: string
    token: string | null
    sessionId: string | null
  }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = (await response.json()) as {
        success: boolean
        message: string
        data: {
          token: string
          sessionId: string
        }
      }

      return {
        success: true,
        message: 'Session created successfully',
        token: data.data.token,
        sessionId: data.data.sessionId,
      }
    } catch (error) {
      console.error('Error creating session:', error)
      return {
        success: false,
        message: 'Error creating session',
        token: null,
        sessionId: null,
      }
    }
  }

  static async checkSession(sessionId: string): Promise<{
    success: boolean
    message: string
    valid: 'active' | 'inactive' | 'expired' | 'deleted'
    email: string
    token: string
  }> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/auth/session/${sessionId}`,
        {
          method: 'GET',
        },
      )
      const data = (await response.json()) as {
        success: boolean
        message: string
        data: {
          valid: 'active' | 'inactive' | 'expired' | 'deleted'
          email: string
          token: string
        }
      }

      return {
        success: true,
        message: 'Session checked successfully',
        valid: data.data.valid || 'inactive',
        email: data.data.email,
        token: data.data.token,
      }
    } catch (error) {
      console.error('Error checking session:', error)
      return {
        success: false,
        message: 'Error checking session',
        valid: 'inactive',
        email: '',
        token: '',
      }
    }
  }
}

export default AuthApi
