'use client'

import * as React from 'react'
import { FileText, Search, X } from 'lucide-react'
import { Button, Checkbox, Input } from '@wren/ui'
import { listKbDocuments, type KbDocument } from './api'

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
  const [documents, setDocuments] = React.useState<KbDocument[]>([])
  const [query, setQuery] = React.useState('')
  const [localSelection, setLocalSelection] = React.useState<string[]>(selectedDocumentIds)

  React.useEffect(() => {
    setLocalSelection(selectedDocumentIds)
  }, [selectedDocumentIds, open])

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      listKbDocuments({ query }).then(setDocuments).catch(console.error)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Attach from KB</h2>
            <p className="text-sm text-muted-foreground">Select one or more documents to use as prompt context.</p>
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
              placeholder="Search documents…"
              className="pl-9"
            />
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {documents.map((document) => {
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
                      {document.collectionName ?? 'Unassigned'} • {document.fileName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {document.summary ?? 'No summary available yet.'}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">{localSelection.length} selected</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm(localSelection)
                onClose()
              }}
            >
              Attach documents
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
