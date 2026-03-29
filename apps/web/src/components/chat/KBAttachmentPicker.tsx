'use client'

/**
 * C-07 (sprint brief) / C-09: KBAttachmentPicker — modal to select KB documents.
 *
 * Multi-select. Reuses KB search patterns from Sprint 2.
 * Shows selected docs as dismissible pills in the composer bar.
 * Calls POST /api/v1/chat/conversations/:id/attachments (S-06) on confirm.
 */
import * as React from 'react'
import { X, Search, Check, BookOpen, Loader2 } from 'lucide-react'
import { Button, Input, Skeleton, cn } from '@wren/ui'
import { listKbDocuments, type KbDocument } from '@/components/kb/api'
import { attachDocuments } from './api'
import { useTranslations } from '@/i18n/translations-context'

interface KBAttachmentPickerProps {
  conversationId: string
  alreadyAttachedIds: string[]
  onClose: () => void
  onAttached: (docs: KbDocument[]) => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function KBAttachmentPicker({
  conversationId,
  alreadyAttachedIds,
  onClose,
  onAttached,
}: KBAttachmentPickerProps) {
  const t = useTranslations()
  const [query, setQuery] = React.useState('')
  const [documents, setDocuments] = React.useState<KbDocument[]>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set(alreadyAttachedIds))
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listKbDocuments({ query: debouncedQuery, mode: 'keyword' })
      .then((docs) => {
        if (!cancelled) setDocuments(docs.filter((d) => d.status === 'ready'))
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load documents')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    const newIds = [...selected].filter((id) => !alreadyAttachedIds.includes(id))
    if (newIds.length === 0) {
      onClose()
      return
    }
    setIsSaving(true)
    try {
      await attachDocuments(conversationId, newIds)
      const attached = documents.filter((d) => newIds.includes(d.id))
      onAttached(attached)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach documents')
    } finally {
      setIsSaving(false)
    }
  }

  // Trap focus and handle Escape
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div
        role="dialog"
        aria-label="Attach KB documents"
        aria-modal="true"
        className="relative z-10 flex flex-col w-full max-w-lg bg-background border border-border rounded-xl shadow-xl mx-4"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Attach KB Documents</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('chat.searchDocuments')}
              className="h-8 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {error && (
            <p className="p-4 text-sm text-destructive text-center">{error}</p>
          )}
          {isLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No documents found.
            </p>
          ) : (
            documents.map((doc) => {
              const isChecked = selected.has(doc.id)
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => toggle(doc.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    isChecked && 'bg-accent'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border',
                      isChecked && 'bg-primary border-primary'
                    )}
                    aria-hidden="true"
                  >
                    {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{doc.fileName}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Attaching…</>
              ) : (
                'Attach'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
