import { BACKEND_URL } from '../config/config'

export const createSession = async () => {
  const response = await fetch(`${BACKEND_URL}/api/v1/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return response.json()
}

export const validateSession = async (sessionId: string) => {
  const response = await fetch(
    `${BACKEND_URL}/api/v1/auth/session/${sessionId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
  return response.json()
}

export const checkSession = async (sessionId: string) => {
  const response = await fetch(
    `${BACKEND_URL}/api/v1/auth/session/${sessionId}`,
    {
      method: 'GET',
    },
  )
  return response.json()
}
