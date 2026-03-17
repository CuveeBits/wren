'use client'

/**
 * C-05 (brief) / C-06 (sprint brief): MessageBubble
 *
 * User: right-aligned, brand colour bg.
 * Assistant: left-aligned, neutral bg.
 * Markdown-safe rendering (code blocks, bold, lists).
 * Inline citation markers [1][2]… are clickable — calls onCitationClick.
 * Loading skeleton variant.
 */
import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@wren/ui'
import { Skeleton } from '@wren/ui'
import type { Message, Citation } from './api'

interface MessageBubbleProps {
  message: Message
  onCitationClick?: (citations: Citation[], index: number) => void
}

/** Replace [1], [2] markers with clickable spans */
function renderContentWithCitations(
  content: string,
  citations: Citation[],
  onCitationClick?: (citations: Citation[], index: number) => void
): React.ReactNode {
  if (!onCitationClick || citations.length === 0) return content

  const parts = content.split(/(\[\d+\])/g)
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (match) {
      const label = match[1] ?? ''
      const idx = parseInt(label, 10) - 1
      return (
        <button
          key={i}
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary/20 text-primary hover:bg-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer align-middle mx-0.5"
          onClick={() => onCitationClick(citations, idx)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onCitationClick(citations, idx)
            }
          }}
          aria-label={`View source ${label}`}
          tabIndex={0}
        >
          {label}
        </button>
      )
    }
    return part
  })
}

export function MessageBubble({ message, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  const citations = message.citations ?? []

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={cn('flex w-full gap-2 px-4 py-1', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            isError && 'bg-destructive/10 text-destructive border border-destructive/20'
          )}
        >
          {isError ? (
            <p className="text-sm">
              {message.errorMessage ?? 'An error occurred. Please retry.'}
            </p>
          ) : isUser ? (
            <p className="whitespace-pre-wrap break-words">
              {renderContentWithCitations(message.content, citations, onCitationClick)}
            </p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p>
                      {React.Children.map(children, (child) =>
                        typeof child === 'string'
                          ? renderContentWithCitations(child, citations, onCitationClick)
                          : child
                      )}
                    </p>
                  ),
                  // Ensure code blocks are styled nicely
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes('language-')
                    return isBlock ? (
                      <code className={cn(className, 'block')} {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="bg-background/50 rounded px-1 py-0.5 text-xs font-mono" {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded-sm align-middle" />
          )}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for a message bubble
 */
export function MessageBubbleSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex w-full gap-2 px-4 py-1', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[60%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}
