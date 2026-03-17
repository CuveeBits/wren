'use client'

/**
 * C-04 (sprint brief) / C-05: MessageThread — scrollable message history.
 *
 * Auto-scrolls to bottom on new messages.
 * Streaming-safe: last assistant bubble updates incrementally as SSE chunks arrive.
 * Shows skeleton on initial load.
 * Shows TypingIndicator when waiting for first chunk.
 */
import * as React from 'react'
import { cn } from '@wren/ui'
import { MessageBubble, MessageBubbleSkeleton } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { Message, Citation } from './api'

interface MessageThreadProps {
  messages: Message[]
  isLoading?: boolean
  isTyping?: boolean
  onCitationClick?: (citations: Citation[], index: number) => void
  className?: string
}

export function MessageThread({
  messages,
  isLoading,
  isTyping,
  onCitationClick,
  className,
}: MessageThreadProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or typing state changes
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  if (isLoading) {
    return (
      <div className={cn('flex-1 overflow-y-auto py-4', className)}>
        <MessageBubbleSkeleton />
        <MessageBubbleSkeleton isUser />
        <MessageBubbleSkeleton />
        <MessageBubbleSkeleton isUser />
      </div>
    )
  }

  return (
    <div className={cn('flex-1 overflow-y-auto py-4', className)}>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onCitationClick={onCitationClick}
        />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}
