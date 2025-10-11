export interface User {
  _id: string
  name: string
  email: string
  admin?: boolean
  clerkId?: string
  provider: 'google' | 'email'
}
