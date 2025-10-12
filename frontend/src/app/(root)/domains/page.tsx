'use client'

import { useInstanceStore } from '@/stores/instanceStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import React, { useEffect, useRef, useState } from 'react'
import { Plus, Globe, Calendar, Copy, Check, RefreshCw } from 'lucide-react'

const Page = () => {
  const { domains, domainsLoading, getDomains, createDomain } =
    useInstanceStore()
  const callOnce = useRef(false)
  const [isCreating, setIsCreating] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null)

  useEffect(() => {
    if (!callOnce.current) {
      callOnce.current = true
      getDomains()
    }
  }, [getDomains])

  const handleCreateDomain = async () => {
    try {
      setIsCreating(true)
      setSuccess(null)
      await createDomain()
      setSuccess('Domain created successfully!')
    } catch (err) {
      console.error('Error creating domain:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain)
      setCopiedDomain(domain)
      setTimeout(() => setCopiedDomain(null), 2000)
    } catch (err) {
      console.error('Failed to copy domain:', err)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">
            Manage your custom domains and subdomains
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={getDomains}
            disabled={domainsLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${domainsLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            onClick={handleCreateDomain}
            disabled={isCreating || domainsLoading}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Domain
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <Alert>
          <AlertDescription className="text-green-600">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Domains Grid */}
      {domainsLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : domains.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Globe className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No domains yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first domain to get started
            </p>
            <Button onClick={handleCreateDomain} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Create Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <Card
              key={domain._id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="font-mono text-lg">
                      {domain.domain}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyDomain(domain.domain)}
                    className="h-8 w-8 p-0"
                  >
                    {copiedDomain === domain.domain ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(domain.createdAt)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        window.open(`https://${domain.domain}`, '_blank')
                      }
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Visit Domain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Page
