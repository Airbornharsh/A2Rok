import { Domain } from '@/types/instance'
import { AxiosClient } from '@/utils/axios'
import { create } from 'zustand'

interface InstanceState {
  domains: Domain[]
  domainsLoading: boolean
  currentDomain: Domain | null
  currentDomainLoading: boolean

  // Actions
  getDomains: () => Promise<void>
  getDomain: (id: string) => Promise<void>
  createDomain: () => Promise<void>
}

export const useInstanceStore = create<InstanceState>()((set, get) => ({
  domains: [],
  domainsLoading: false,
  currentDomain: null,
  currentDomainLoading: false,

  getDomains: async () => {
    try {
      set({ domainsLoading: true })
      const response = await AxiosClient.get('/api/v1/instance/domains')
      set({ domains: response.data.data.domains })
    } catch (error) {
      console.error('Error fetching domains:', error)
      set({ domains: [] })
    } finally {
      set({ domainsLoading: false })
    }
  },

  getDomain: async (id: string) => {
    try {
      set({ currentDomainLoading: true })
      const response = await AxiosClient.get(`/api/v1/instance/domains/${id}`)
      set({ currentDomain: response.data.data.domain })
    } catch (error) {
      console.error('Error fetching domain:', error)
    } finally {
      set({ currentDomainLoading: false })
    }
  },

  createDomain: async () => {
    try {
      set({ domainsLoading: true })
      await AxiosClient.post('/api/v1/instance/domains')
      await get().getDomains()
    } catch (error) {
      console.error('Error creating domain:', error)
    } finally {
      set({ domainsLoading: false })
    }
  },
}))
