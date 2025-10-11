'use client'
import { useAuthStore } from '@/stores/authStore'
import { useAuth, useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, user: clerkUser } = useUser()
  const { getToken } = useAuth()
  //   const user = useAuthStore((state) => state.user)
  //   const isUserLoaded = useAuthStore((state) => state.isUserLoaded)
  const getUser = useAuthStore((state) => state.getUser)
  const setToken = useAuthStore((state) => state.setToken)
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated)
  //   const callOnce = useRef(false)
  const router = useRouter()

  useEffect(() => {
    const onLoad = async () => {
      if (isLoaded) {
        if (clerkUser) {
          const token = await getToken()
          setToken(token)
          setIsAuthenticated(true)
          getUser()
        } else {
          router.push('/auth')
        }
      }
    }
    onLoad()
  }, [
    isLoaded,
    clerkUser,
    getUser,
    router,
    getToken,
    setToken,
    setIsAuthenticated,
  ])

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return <div className="h-screen">{children}</div>
}
