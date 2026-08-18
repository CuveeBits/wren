'use client'

import * as React from 'react'
import { FileText, Search, X } from 'lucide-react'
import { Button, Checkbox, Input } from '@wren/ui'
import { listKbDocuments, type KbDocument } from './api'
import { useTranslations } from '@/i18n/translations-context'

interface AttachFromKbProps {
  open: boolean
  selectedDocumentIds: string[]
  onClose: () => void
  onConfirm: (documentIds: string[]) => void
}

export function AttachFromKb({
  open,
  selectedDocumentIds,
  onClose,
  onConfirm,
}: AttachFromKbProps) {
  const t = useTranslations()
  const [documents, setDocuments] = React.useState<KbDocument[]>([])
  const [query, setQuery] = React.useState('')
  const [localSelection, setLocalSelection] = React.useState<string[]>(selectedDocumentIds)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLocalSelection(selectedDocumentIds)
  }, [selectedDocumentIds, open])

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      setError(null)
      listKbDocuments({ query })
        .then(setDocuments)
        .catch((nextError: unknown) => {
          setDocuments([])
          setError(nextError instanceof Error ? nextError.message : t('kb.failedLoadDocuments'))
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, query, t])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{t('kb.attachTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('kb.attachSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('kb.searchPlaceholder')}
              className="pl-9"
            />
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : (
              documents.map((document) => {
                const checked = localSelection.includes(document.id)
                return (
                  <label
                    key={document.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        setLocalSelection((current) =>
                          nextChecked
                            ? [...current, document.id]
                            : current.filter((id) => id !== document.id)
                        )
                      }}
                    />
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{document.title}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {document.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {document.collectionName ?? t('kb.unassigned')} • {document.fileName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {document.summary ?? t('kb.noSummary')}
                      </p>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {t('kb.attachSelected').replace('{count}', String(localSelection.length))}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm(localSelection)
                onClose()
              }}
            >
              {t('kb.attachDocuments')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
