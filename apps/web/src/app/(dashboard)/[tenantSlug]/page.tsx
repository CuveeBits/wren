'use client'

/**
 * Dashboard home page — /[tenantSlug]
 *
 * Sprint 4b: uses next-intl useTranslations() for i18n (client component).
 */
import Link from 'next/link'
import { Sparkles, Database, MessageSquare } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import { useTranslations } from '@/i18n/translations-context'

export default function DashboardPage() {
  const params = useParams<{ tenantSlug: string }>()
  const { tenantSlug } = params
  const { user } = useUser()
  const t = useTranslations()

  const displayName =
    user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'there'

  const COMING_SOON_CARDS = [
    {
      title: t('dashboard.agentBuilder.title'),
      description: t('dashboard.agentBuilder.desc'),
    },
    {
      title: t('dashboard.workflowBuilder.title'),
      description: t('dashboard.workflowBuilder.desc'),
    },
    {
      title: t('dashboard.channelsCard.title'),
      description: t('dashboard.channelsCard.desc'),
    },
    {
      title: t('dashboard.analyticsCard.title'),
      description: t('dashboard.analyticsCard.desc'),
    },
  ]

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboard.welcomeBack', { name: displayName })}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('dashboard.workspace')}{' '}
          <span className="font-medium text-foreground">{tenantSlug}</span>
        </p>
      </div>

      {/* Quick-access cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Prompt Library */}
        <Link
          href={`/${tenantSlug}/prompts`}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {t('dashboard.promptLibrary.title')}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.promptLibrary.desc')}
          </p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            {t('dashboard.promptLibrary.badge')}
          </span>
        </Link>

        {/* Knowledge Base */}
        <Link
          href={`/${tenantSlug}/kb`}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {t('dashboard.kb.title')}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.kb.desc')}
          </p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            {t('dashboard.kb.badge')}
          </span>
        </Link>

        {/* Chat */}
        <Link
          href={`/${tenantSlug}/chat`}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {t('dashboard.chat.title')}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.chat.desc')}
          </p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            {t('dashboard.chat.badge')}
          </span>
        </Link>

        {/* Placeholder cards — not yet built */}
        {COMING_SOON_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-border bg-card p-6 opacity-60"
          >
            <h3 className="font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {card.description}
            </p>
            <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t('dashboard.comingSoon')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
