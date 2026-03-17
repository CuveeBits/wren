'use client'

/**
 * C-03: ConversationList — sidebar component
 *
 * Fetches GET /api/v1/chat/conversations (built by Spark S-01).
 * Groups conversations by recency: Today / This week / Older.
 * Shows title (or first 40 chars of userId as placeholder), last message snippet, timestamp.
 * Active conversation is highlighted.
 */
import * as React from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Skeleton, cn } from '@wren/ui'
import { listConversations, type Conversation } from './api'

interface ConversationListProps {
  tenantSlug: string
  activeId?: string
  /** Refresh trigger — increment to force a re-fetch */
  refreshKey?: number
}

type Group = 'Today' | 'This week' | 'Older'

function groupConversations(convos: Conversation[]): Record<Group, Conversation[]> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const groups: Record<Group, Conversation[]> = {
    Today: [],
    'This week': [],
    Older: [],
  }

  for (const c of convos) {
    const d = new Date(c.lastMessageAt ?? c.createdAt)
    if (d >= todayStart) {
      groups.Today.push(c)
    } else if (d >= weekStart) {
      groups['This week'].push(c)
    } else {
      groups.Older.push(c)
    }
  }
  return groups
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (d >= todayStart) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ConversationList({ tenantSlug, activeId, refreshKey }: ConversationListProps) {
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listConversations({ channel: 'app' })
      .then((data) => {
        if (!cancelled) setConversations(data)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load conversations')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="p-4 text-xs text-destructive">
        {error}
      </p>
    )
  }

  if (conversations.length === 0) {
    return (
      <p className="p-4 text-xs text-muted-foreground text-center">
        No conversations yet.
      </p>
    )
  }

  const groups = groupConversations(conversations)
  const groupOrder: Group[] = ['Today', 'This week', 'Older']

  return (
    <div className="flex flex-col gap-1 px-2 py-1 overflow-y-auto">
      {groupOrder.map((group) => {
        const items = groups[group]
        if (items.length === 0) return null
        return (
          <div key={group}>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
            {items.map((conv) => (
              <Link
                key={conv.id}
                href={`/${tenantSlug}/chat/${conv.id}`}
                className={cn(
                  'flex items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent',
                  activeId === conv.id && 'bg-accent'
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-medium text-foreground leading-tight">
                      {conv.title ?? conv.userId.slice(0, 32)}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(conv.lastMessageAt ?? conv.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}
