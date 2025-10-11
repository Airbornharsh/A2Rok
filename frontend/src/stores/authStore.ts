import { AxiosClient } from '@/utils/axios'
import { User } from '@/types/auth'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getTerminalToken } from '@/utils/session'

interface AuthState {
  isUserLoaded: boolean
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  isTerminalSessionLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  getUser: () => Promise<void>
  logout: () => void
  completeTerminalSession: () => Promise<void>
  checkLocalTerminalSession: () => boolean
  clearError: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isUserLoaded: false,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isTerminalSessionLoading: false,

      setUser: (user: User | null) => {
        set({ user })
      },

      setToken: (token: string | null) => {
        set({ token })
      },

      setIsAuthenticated: (isAuthenticated: boolean) => {
        set({ isAuthenticated })
      },

      getUser: async () => {
        set({ isUserLoaded: false })
        try {
          const response = await AxiosClient.get('/api/v1/auth/user')
          const data = response.data.data.user
          const newUser: User = {
            _id: data._id,
            name: get().user?.name || '',
            clerkId: get().user?.clerkId || '',
            email: get().user?.email || '',
            admin: data.admin,
            provider: data.provider || 'email',
          }
          set({
            user: newUser,
          })
        } catch (error) {
          console.error('Error fetching user:', error)
        } finally {
          set({ isUserLoaded: true })
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      completeTerminalSession: async () => {
        set({ isTerminalSessionLoading: true })
        try {
          await AxiosClient.post(`/api/v1/auth/session/${getTerminalToken()}`)
        } catch (error) {
          console.error('Error completing terminal session:', error)
        } finally {
          set({ isTerminalSessionLoading: false })
        }
      },

      checkLocalTerminalSession: () => {
        const token = getTerminalToken()
        if (token) {
          return true
        }
        return false
      },

      clearError: () => {
        set({ error: null })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
)
