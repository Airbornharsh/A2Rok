'use client'
import { useUser } from '@clerk/nextjs'

export default function Home() {
  const { user } = useUser()

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h1>Authenticated User: {user?.emailAddresses[0].emailAddress}</h1>
    </div>
  )
}
