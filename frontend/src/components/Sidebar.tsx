'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'

const routes = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Domains', href: '/domains', icon: Globe },
]

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        'relative flex h-screen flex-col border-r border-gray-800 bg-gray-900 text-gray-100 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Toggle Button */}
      <div className="absolute right-[-12px] top-4">
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 rounded-full bg-gray-800 text-gray-200 hover:bg-gray-700"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
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
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
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
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
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
      <div className="border-t border-gray-800 p-4 text-xs text-gray-500">
        {!collapsed && <p>© 2025 A2Rok</p>}
      </div>
    </div>
  )
}

export default Sidebar
