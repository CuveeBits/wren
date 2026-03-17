'use client'

/**
 * Dashboard shell — the main layout for all authenticated tenant pages.
 *
 * Features:
 * - Sidebar navigation (responsive — collapses on mobile)
 * - User avatar (from Clerk)
 * - Dark/light mode toggle
 * - White-label ready (CSS variable --primary applied from tenant config)
 *
 * Sprint 0: nav links are placeholders (no href yet). Real routes ship Sprint 1+.
 */
import * as React from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useUser, UserButton } from '@clerk/nextjs'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarNavItem,
  SidebarSection,
  Avatar,
  ThemeToggle,
} from '@wren/ui'
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Bot,
  Workflow,
  MessageSquare,
  BarChart2,
  Settings,
  Menu,
} from 'lucide-react'

interface DashboardShellProps {
  tenantSlug: string
  children: React.ReactNode
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <LayoutDashboard />, hrefSuffix: '', sprint: 0 },
  { label: 'Prompts', icon: <Sparkles />, hrefSuffix: '/prompts', sprint: 1 },
  { label: 'Knowledge Base', icon: <BookOpen />, hrefSuffix: '/kb', sprint: 2 },
  { label: 'Chat', icon: <MessageSquare />, hrefSuffix: '/chat', sprint: 3 },
  { label: 'Agents', icon: <Bot />, hrefSuffix: '#', sprint: 2 },
  { label: 'Workflows', icon: <Workflow />, hrefSuffix: '#', sprint: 4 },
  { label: 'Channels', icon: <MessageSquare />, hrefSuffix: '#', sprint: 4 },
  { label: 'Analytics', icon: <BarChart2 />, hrefSuffix: '#', sprint: 5 },
]

const BOTTOM_NAV = [
  { label: 'Settings', icon: <Settings />, href: '#' },
]

export function DashboardShell({ tenantSlug, children }: DashboardShellProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const sidebarContent = (
    <>
      <SidebarHeader>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Brand mark — replaced with tenant logo in white-label (ADR-015) */}
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              W
            </div>
            <span className="font-semibold text-sm truncate max-w-[120px]">
              {tenantSlug}
            </span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSection label="Menu">
          {NAV_ITEMS.map((item) => {
            const href =
              item.hrefSuffix === '#'
                ? '#'
                : `/${tenantSlug}${item.hrefSuffix}`
            const isActive = href !== '#' && (href === `/${tenantSlug}` ? pathname === href : pathname.startsWith(href))
            return (
              <SidebarNavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                href={href}
                active={isActive}
              />
            )
          })}
        </SidebarSection>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3">
          {/* Clerk UserButton handles sign-out, profile, org switching */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.emailAddresses[0]?.emailAddress ?? ''}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex">
        <Sidebar>{sidebarContent}</Sidebar>
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar className="relative z-50">{sidebarContent}</Sidebar>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">{tenantSlug}</span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
