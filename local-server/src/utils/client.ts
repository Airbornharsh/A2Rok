import { BACKEND_URL } from '../config/config'
import Session from './session'

// Function to get session token
const getSessionToken = async () => {
  try {
    const session = await Session.getSession()
    if (session && session.token) {
      return session.token
    }
  } catch (error) {
    console.error('Failed to get session token:', error)
  }

  return null
}

// Custom fetch client with interceptors-like functionality
class FetchClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL
    this.defaultHeaders = defaultHeaders
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getSessionToken()
    const headers = { ...this.defaultHeaders }

    if (token) {
      headers.Authorization = `Terminal ${token}`
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const authHeaders = await this.getAuthHeaders()

    const config: RequestInit = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return (await response.json()) as T
      }

      return (await response.text()) as unknown as T
    } catch (error) {
      console.error('Fetch request failed:', error)
      throw error
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {},
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      method: 'POST',
    }

    if (data) {
      config.body = JSON.stringify(data)
    }

    return this.request<T>(endpoint, config)
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {},
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      method: 'PUT',
    }

    if (data) {
      config.body = JSON.stringify(data)
    }

    return this.request<T>(endpoint, config)
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {},
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      method: 'PATCH',
    }

    if (data) {
      config.body = JSON.stringify(data)
    }

    return this.request<T>(endpoint, config)
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create and export the fetch client instance
export const FetchClientInstance = new FetchClient(BACKEND_URL, {
  'Content-Type': 'application/json',
})

// Export the class for custom instances if needed
export { FetchClient }
