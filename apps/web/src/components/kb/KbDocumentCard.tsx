'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock3, FileText } from 'lucide-react'
import { Badge, cn } from '@wren/ui'
import { KbTagBadge } from './KbTagBadge'
import type { KbDocument } from './api'

interface KbDocumentCardProps {
  tenantSlug: string
  document: KbDocument
}

const STATUS_STYLES = {
  processing: {
    icon: Clock3,
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
  },
  ready: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  error: {
    icon: AlertTriangle,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
} as const

function formatBytes(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  if (sizeBytes >= 1024) return `${Math.round(sizeBytes / 1024)} KB`
  return `${sizeBytes} B`
}

function getFileTypeLabel(mimeType: string) {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('wordprocessingml')) return 'DOCX'
  return 'TXT'
}

export function KbDocumentCard({ tenantSlug, document }: KbDocumentCardProps) {
  const statusStyle = STATUS_STYLES[document.status]
  const StatusIcon = statusStyle.icon
  const fileType = getFileTypeLabel(document.mimeType)

  return (
    <Link
      href={`/${tenantSlug}/kb/documents/${document.id}`}
      className={cn(
        'group flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5',
        'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {fileType}
            </p>
            <p className="text-xs text-muted-foreground">{formatBytes(document.sizeBytes)}</p>
          </div>
        </div>
        <Badge className={cn('gap-1 rounded-full border px-2 py-1 text-[11px]', statusStyle.className)}>
          <StatusIcon className="h-3 w-3" />
          {document.status}
        </Badge>
      </div>

      <div className="space-y-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {document.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {document.collectionName ?? 'Unassigned'} • {new Date(document.createdAt).toLocaleDateString()}
        </p>
        <p className="line-clamp-3 min-h-[3rem] text-xs text-muted-foreground">
          {document.summary ??
            (document.status === 'processing'
              ? 'This document is still being parsed and chunked.'
              : document.errorMessage ?? 'No summary available yet.')}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {document.tags.length > 0 ? (
          document.tags.slice(0, 3).map((tag) => <KbTagBadge key={tag} tag={tag} />)
        ) : (
          <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
            No tags
          </Badge>
        )}
      </div>
    </Link>
  )
}
