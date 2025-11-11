'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Globe,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Domains', href: '/domains', icon: Globe },
]

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: '/auth' })
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      logout()
      router.push('/auth')
    }
  }

  return (
    <div
      className={cn(
        'border-border text-sidebar-foreground relative flex h-screen flex-col border-r bg-[#0c0c0c] transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Toggle Button */}
      <div className="absolute right-[-12px] top-4">
        <Button
          variant="secondary"
          size="icon"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-6 w-6 rounded-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Sidebar Header */}
      <div className="border-border flex h-16 items-center justify-center border-b">
        {!collapsed ? (
          <span className="text-xl font-bold tracking-wide">A2Rok</span>
        ) : (
          <span className="text-lg font-bold">A2R</span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="mt-4 flex-1 space-y-1">
        {routes.map((route) => {
          const Icon = route.icon
          const active = pathname === route.href
          if (pathname === '/help')
            return (
              <div
                key={route.name}
                className={cn(
                  'mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2 transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                )}
                onClick={() => (window.location.href = route.href)}
              >
                <Icon size={20} />
                {!collapsed && (
                  <span className="text-sm font-medium">{route.name}</span>
                )}
              </div>
            )

          return (
            <Link key={route.name} href={route.href}>
              <div
                className={cn(
                  'mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2 transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                )}
              >
                <Icon size={20} />
                {!collapsed && (
                  <span className="text-sm font-medium">{route.name}</span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-border text-muted-foreground border-t p-4 text-xs">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive flex w-full items-center justify-center gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
        {!collapsed && (
          <p className="mt-2 text-[10px] uppercase tracking-wide">
            © 2025 A2Rok
          </p>
        )}
      </div>
    </div>
  )
}

export default Sidebar
