'use client'

/**
 * PromptCard — displays a prompt template in the library browse grid.
 */
import Link from 'next/link'
import { useTranslations } from '@/i18n/translations-context'
import { Clock } from 'lucide-react'
import { Badge, cn } from '@wren/ui'

interface PromptCardProps {
  id: string
  title: string
  description: string | null
  category: string
  department: string
  difficulty: string
  estimatedMinutesSaved: number | null
  tenantSlug: string
}

const DIFFICULTY_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  beginner: 'secondary',
  intermediate: 'default',
  advanced: 'destructive',
}

export function PromptCard({
  id,
  title,
  description,
  category,
  department,
  difficulty,
  estimatedMinutesSaved,
  tenantSlug,
}: PromptCardProps) {
  const t = useTranslations()
  return (
    <Link
      href={`/${tenantSlug}/prompts/${id}`}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-border bg-card p-5',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {/* Top row: department + difficulty badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize text-xs">
          {department.replace(/-/g, ' ')}
        </Badge>
        <Badge
          variant={DIFFICULTY_VARIANT[difficulty] ?? 'secondary'}
          className="capitalize text-xs"
        >
          {difficulty}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
          {description}
        </p>
      )}

      {/* Footer */}
      {estimatedMinutesSaved !== null && estimatedMinutesSaved > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
          <Clock className="h-3 w-3" />
          <span>{t('prompts.savesMins').replace('{count}', String(estimatedMinutesSaved))}</span>
        </div>
      )}
    </Link>
  )
}
