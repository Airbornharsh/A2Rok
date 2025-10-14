'use client'

import { useAuthStore } from '@/stores/authStore'
import { clearTerminalToken } from '@/utils/session'
import { useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useRef } from 'react'

const Page = () => {
  const { isLoaded, user: clerkUser } = useUser()
  const { user } = useAuthStore()
  const completeTerminalSession = useAuthStore(
    (state) => state.completeTerminalSession,
  )
  const isTerminalSessionLoading = useAuthStore(
    (state) => state.isTerminalSessionLoading,
  )
  const router = useRouter()
  const searchParams = useSearchParams()
  const linked = searchParams.get('linked')
  const callOnce = useRef(false)

  useEffect(() => {
    if (isLoaded && !callOnce.current) {
      callOnce.current = true
      if (clerkUser && user) {
        completeTerminalSession()
      } else {
        router.push('/auth')
      }
    }
  }, [isLoaded, clerkUser, user, completeTerminalSession, router, linked])

  useEffect(() => {
    if (linked && user && clerkUser) {
      clearTerminalToken()
    }
  }, [linked, completeTerminalSession, user, clerkUser])

  if (isTerminalSessionLoading) {
    return (
      <div className="bg-background/50 fixed bottom-0 left-0 right-0 top-0 z-50 flex h-screen w-screen items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-foreground text-center text-sm">
          Validating terminal session...
        </p>
      </div>
    )
  }

  if (linked) {
    return (
      <div className="bg-background/50 fixed bottom-0 left-0 right-0 top-0 z-50 flex h-screen w-screen flex-col items-center justify-center gap-2">
        <p className="text-foreground text-center text-sm">
          Linked to terminal
        </p>
        <p className="text-foreground text-center text-sm">
          You can close this window now
        </p>
      </div>
    )
  }

  return <div>Page</div>
}

export default Page
