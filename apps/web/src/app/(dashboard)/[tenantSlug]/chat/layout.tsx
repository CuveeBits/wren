/**
 * C-01 (sprint brief): Chat layout — history rail + thread panel.
 *
 * Two-pane layout:
 * - Left rail: ConversationList + search + new button (collapses on mobile)
 * - Right area: thread panel (children)
 */
'use client'

import * as React from 'react'
import { useParams, usePathname } from 'next/navigation'
import { MessageSquare, Settings, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { Button, cn } from '@wren/ui'
import { ConversationList } from '@/components/chat/ConversationList'
import { ConversationSearch } from '@/components/chat/ConversationSearch'
import { NewConversationButton } from '@/components/chat/NewConversationButton'
import { ChatErrorBoundary } from '@/components/chat/ChatErrorBoundary'

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Extract active conversation id from pathname
  const activeId = pathname.match(/\/chat\/([^/]+)/)?.[1]

  function handleSearch(q: string) {
    setSearchQuery(q)
  }

  function handleConversationCreated() {
    setRefreshKey((k) => k + 1)
  }

  const rail = (
    <aside
      className={cn(
        'flex h-full w-64 shrink-0 flex-col border-r border-border bg-background',
        'md:flex md:relative md:translate-x-0',
        sidebarOpen ? 'flex' : 'hidden md:flex'
      )}
    >
      {/* Rail header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/${tenantSlug}/chat/settings`}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Chat settings"
            aria-label="Chat settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New conversation button */}
      <div className="px-2 pt-2 pb-1">
        <NewConversationButton
          tenantSlug={tenantSlug}
          onCreated={handleConversationCreated}
        />
      </div>

      {/* Search */}
      <div className="px-2 pb-2">
        <ConversationSearch onSearch={handleSearch} />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-hidden">
        <ConversationList
          tenantSlug={tenantSlug}
          activeId={activeId}
          refreshKey={refreshKey}
        />
      </div>
    </aside>
  )

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile overlay when rail is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile rail as overlay */}
      {sidebarOpen && (
        <div className="fixed left-0 top-0 bottom-0 z-40 md:hidden">{rail}</div>
      )}

      {/* Desktop rail */}
      <div className="hidden md:flex md:h-full">{rail}</div>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Open conversation list"
          >
            <Menu className="h-5 w-5" />
          </button>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Chat</span>
        </div>

        {/* Page content */}
        <ChatErrorBoundary>
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </ChatErrorBoundary>
      </div>
    </div>
  )
}
