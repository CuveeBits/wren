'use client'

/**
 * C-08 (sprint brief) / C-10: CitationDrawer
 *
 * Slide-in panel showing KB chunk sources for a message.
 * Opens on citation marker [n] click.
 * Desktop: slide-in from right.
 * Mobile: bottom sheet.
 */
import * as React from 'react'
import { X, BookOpen, Hash } from 'lucide-react'
import { cn } from '@wren/ui'
import type { Citation } from './api'

interface CitationDrawerProps {
  citations: Citation[]
  activeIndex: number
  onClose: () => void
}

export function CitationDrawer({ citations, activeIndex, onClose }: CitationDrawerProps) {
  const activeCitation = citations[activeIndex] ?? citations[0]

  // Handle Escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!activeCitation) return null

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="complementary"
        aria-label="Citation sources"
        className={cn(
          // Mobile: bottom sheet
          'fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] rounded-t-xl border border-border bg-background shadow-xl',
          'flex flex-col overflow-hidden',
          // Desktop: right panel
          'md:bottom-0 md:right-0 md:left-auto md:top-0 md:w-80 md:max-h-full md:rounded-none md:rounded-l-xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Sources</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {citations.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Close sources panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Citations list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {citations.map((citation, idx) => (
            <div
              key={citation.chunkId ?? idx}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                idx === activeIndex
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-muted/30'
              )}
            >
              {/* Citation label + document title */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium leading-tight">{citation.documentTitle}</span>
                </div>
                {citation.pageNumber != null && (
                  <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    <span>p.{citation.pageNumber}</span>
                  </div>
                )}
              </div>

              {/* Excerpt */}
              {citation.excerpt && (
                <blockquote className="border-l-2 border-border pl-3 text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  {citation.excerpt}
                </blockquote>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
