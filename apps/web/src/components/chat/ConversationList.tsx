'use client'

/**
 * C-03: ConversationList — sidebar component
 * Sprint 4b: fully localised via useTranslations
 */
import * as React from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Skeleton, cn } from '@wren/ui'
import { listConversations, type Conversation } from './api'
import { useTranslations } from '@/i18n/translations-context'

interface ConversationListProps {
  tenantSlug: string
  activeId?: string
  refreshKey?: number
}

type Group = 'today' | 'thisWeek' | 'older'

function groupConversations(convos: Conversation[]): Record<Group, Conversation[]> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const groups: Record<Group, Conversation[]> = {
    today: [],
    thisWeek: [],
    older: [],
  }

  for (const c of convos) {
    const d = new Date(c.lastMessageAt ?? c.createdAt)
    if (d >= todayStart) {
      groups.today.push(c)
    } else if (d >= weekStart) {
      groups.thisWeek.push(c)
    } else {
      groups.older.push(c)
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
  const t = useTranslations()
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
          setError(err instanceof Error ? err.message : t('chat.failedLoadConversations'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, t])

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
        {t('chat.noConversations')}
      </p>
    )
  }

  const groups = groupConversations(conversations)

  const groupConfig: Array<{ key: Group; label: string }> = [
    { key: 'today', label: t('chat.today') },
    { key: 'thisWeek', label: t('chat.thisWeek') },
    { key: 'older', label: t('chat.older') },
  ]

  return (
    <div className="flex flex-col gap-1 px-2 py-1 overflow-y-auto">
      {groupConfig.map(({ key, label }) => {
        const items = groups[key]
        if (items.length === 0) return null
        return (
          <div key={key}>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
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
