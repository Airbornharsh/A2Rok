import axios, { InternalAxiosRequestConfig } from 'axios'
import { BACKEND_URL } from '@/config/config'

// Function to get Clerk session token
const getClerkToken = async () => {
  try {
    const authToken = localStorage.getItem('auth-storage')
    if (authToken) {
      const parsed = JSON.parse(authToken)
      if (parsed.state.token) {
        return parsed.state.token
      }
    }
  } catch (error) {
    console.error('Failed to parse auth token:', error)
  }

  return null
}

export const AxiosClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

AxiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getClerkToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
)
