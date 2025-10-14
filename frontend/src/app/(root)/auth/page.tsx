'use client'

import { SignIn, SignUp, useSignIn } from '@clerk/nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function AuthPage() {
  const [tab, setTab] = useState<'demo' | 'signin' | 'signup'>('demo')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useSignIn()
  const loadedData = useMemo(() => {
    return {
      email: 'harshkeshriwork@gmail.com',
      password: 'Airbornharsh123#',
    }
  }, [])

  const handleDemoSignIn = async () => {
    try {
      setIsLoading(true)
      if (!signIn) return
      const { email, password } = loadedData
      const result = await signIn.create({
        identifier: email,
        password,
      })
      if (result.status === 'complete') {
        window.location.href = '/'
      } else {
        setTab('signin')
      }
    } catch (error) {
      console.error(error)
      setTab('signin')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-background flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-0 border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome To A2Rok</CardTitle>
            <CardDescription>
              Choose your preferred authentication method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue={tab}
              onValueChange={(value) =>
                setTab(value as 'demo' | 'signin' | 'signup')
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="demo">Demo</TabsTrigger>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="demo" className="mt-6">
                <div className="flex flex-col items-center gap-3">
                  <Button onClick={handleDemoSignIn} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Demo Sign In'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signin" className="mt-6">
                <div className="space-y-4">
                  <SignIn
                    routing="hash"
                    signUpUrl="/auth#signup"
                    afterSignInUrl="/"
                  />
                </div>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <div className="space-y-4">
                  <SignUp
                    routing="hash"
                    signInUrl="/auth#signin"
                    afterSignUpUrl="/"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
