'use client'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
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
      if (isLoaded && pathname && !callOnce.current) {
        callOnce.current = true
        if (clerkUser) {
          const token = await getToken()
          setToken(token)
          setIsAuthenticated(true)
          getUser()
        } else {
          if (pathname !== '/help') router.push('/auth')
        }
      }
    }
    onLoad()
  }, [
    isLoaded,
    clerkUser,
    pathname,
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
      <div className="flex flex-1 flex-col">
        {/* Top navbar */}
        <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4 text-sm">
          <div className="font-semibold">A2Rok</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => router.push('/help')}>
              Guide
            </Button>
            <div className="text-zinc-400">
              {clerkUser?.emailAddresses?.[0]?.emailAddress ||
                user?.email ||
                ''}
            </div>
          </div>
        </div>
        <div className="h-[calc(100vh-48px)] flex-1 overflow-auto">
          {children}
        </div>
      </div>
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
