'use client'
import Sidebar from '@/components/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { getTerminalToken, setTerminalToken } from '@/utils/session'
import { useAuth, useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef } from 'react'

function RootLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, user: clerkUser } = useUser()
  const { user } = useAuthStore()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const terminalToken = searchParams.get('token')
  const getUser = useAuthStore((state) => state.getUser)
  const setToken = useAuthStore((state) => state.setToken)
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated)
  const checkLocalTerminalSession = useAuthStore(
    (state) => state.checkLocalTerminalSession,
  )
  //   const callOnce = useRef(false)
  const router = useRouter()
  const callOnce = useRef(false)
  const callOnce2 = useRef(false)

  useEffect(() => {
    const onLoad = async () => {
      if (isLoaded && !callOnce.current) {
        callOnce.current = true
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

  useEffect(() => {
    if (terminalToken) {
      setTerminalToken(terminalToken)
    }

    const terminalTokenData = getTerminalToken()
    if (clerkUser && user && terminalTokenData && !callOnce2.current) {
      callOnce2.current = true
      router.push('/terminal?linked=true')
    }
  }, [terminalToken, checkLocalTerminalSession, router, clerkUser, user])

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

export default function SuspenseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <RootLayout>{children}</RootLayout>
    </Suspense>
  )
}
