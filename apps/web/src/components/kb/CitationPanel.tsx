'use client'

import * as React from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import { cn } from '@wren/ui'

export interface CitationItem {
  chunkId: string
  documentId: string
  documentTitle: string
  documentFileName: string
  excerpt: string
  pageNumber?: number
  chunkIndex: number
}

interface CitationPanelProps {
  citations: CitationItem[]
}

export function CitationPanel({ citations }: CitationPanelProps) {
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({})

  if (citations.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Citations</h3>
        <p className="text-xs text-muted-foreground">Source chunks emitted with the stream response.</p>
      </div>

      <div className="space-y-2">
        {citations.map((citation, index) => {
          const isOpen = openIds[citation.chunkId] ?? index === 0
          return (
            <div key={citation.chunkId} className="overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/40"
                onClick={() =>
                  setOpenIds((current) => ({
                    ...current,
                    [citation.chunkId]: !isOpen,
                  }))
                }
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    [Source {index + 1}] {citation.documentTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {citation.documentFileName}
                    {citation.pageNumber ? ` • page ${citation.pageNumber}` : ''}
                  </p>
                </div>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    chunk {citation.chunkIndex + 1}
                  </div>
                  <p>{citation.excerpt}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
