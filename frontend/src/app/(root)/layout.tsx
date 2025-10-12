'use client'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { setTerminalToken } from '@/utils/session'
import { useAuth, useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoaded, user: clerkUser } = useUser()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const token = searchParams.get('token')
  const getUser = useAuthStore((state) => state.getUser)
  const setToken = useAuthStore((state) => state.setToken)
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated)
  const checkLocalTerminalSession = useAuthStore(
    (state) => state.checkLocalTerminalSession,
  )
  //   const callOnce = useRef(false)
  const router = useRouter()
  const callOnce = useRef(false)

  useEffect(() => {
    const onLoad = async () => {
      if (isLoaded && !callOnce.current) {
        callOnce.current = true
        if (clerkUser) {
          const token = await getToken()
          setToken(token)
          setIsAuthenticated(true)
          getUser()

          const isLocalTerminalSession = checkLocalTerminalSession()
          if (isLocalTerminalSession) {
            router.push('/terminal?linked=true')
          }
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
    checkLocalTerminalSession,
  ])

  useEffect(() => {
    if (token) {
      setTerminalToken(token)
    }
  }, [token])

  const isLoadSidebar = useMemo(() => {
    return pathname !== '/auth' && pathname !== '/terminal'
  }, [pathname])

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {isLoadSidebar && <Sidebar />}
      <div className="flex-1">{children}</div>
    </div>
  )
}
