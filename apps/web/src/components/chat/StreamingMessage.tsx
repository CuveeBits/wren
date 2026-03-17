'use client'

/**
 * C-09 (sprint brief): StreamingMessage — renders SSE token stream as it arrives.
 *
 * Shows animated cursor while streaming.
 * Used as the assistant's message bubble during active SSE stream.
 * Content is streamed incrementally — each chunk is appended to the display.
 *
 * Note: In the full chat page, streaming is handled inline in MessageBubble
 * (status: 'streaming' + animated cursor). This component provides the
 * standalone streaming renderer for cases where it is used independently.
 */
import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@wren/ui'

interface StreamingMessageProps {
  content: string
  /** Whether the stream is still active (shows cursor when true) */
  isStreaming: boolean
  className?: string
}

export function StreamingMessage({ content, isStreaming, className }: StreamingMessageProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
    >
      <ReactMarkdown
        components={{
          code: ({ className: cls, children, ...props }) => {
            const isBlock = cls?.includes('language-')
            return isBlock ? (
              <code className={cn(cls, 'block')} {...props}>{children}</code>
            ) : (
              <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono" {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/70 animate-pulse rounded-sm align-middle"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
