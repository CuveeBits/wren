/**
 * Dashboard home page — /dashboard/[tenantSlug]
 */
import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'

interface DashboardPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenantSlug } = await params
  const user = await currentUser()

  const displayName =
    user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'there'

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Workspace:{' '}
          <span className="font-medium text-foreground">{tenantSlug}</span>
        </p>
      </div>

      {/* Quick-access cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Prompt Library — live in Sprint 1 */}
        <Link
          href={`/${tenantSlug}/prompts`}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Prompt Library
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Browse and run AI prompt templates — generate results in seconds.
          </p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            Ready to use
          </span>
        </Link>

        <Link
          href={`/${tenantSlug}/kb`}
          className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Knowledge Base
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload, tag, and organize documents for retrieval-backed prompt execution.
          </p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            Ready to use
          </span>
        </Link>

        {/* Future sprints — placeholder cards */}
        {[
          {
            title: 'Agent Builder',
            description: 'Create and configure AI agents',
            sprint: 'Sprint 2',
          },
          {
            title: 'Workflow Builder',
            description: 'Automate business processes with n8n',
            sprint: 'Sprint 4',
          },
          {
            title: 'Channels',
            description: 'Connect Teams, Slack, WhatsApp, and more',
            sprint: 'Sprint 4',
          },
          {
            title: 'Analytics',
            description: 'Track usage, costs, and performance',
            sprint: 'Sprint 5',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-border bg-card p-6 opacity-60"
          >
            <h3 className="font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {card.description}
            </p>
            <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Coming in {card.sprint}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
