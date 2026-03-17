'use client'

/**
 * C-11 (sprint brief) / C-12: ChatEmptyState — first-run screen.
 *
 * Welcome copy + 3 suggested prompt starters.
 * Brand-aware if TenantChatSettings has welcome message.
 */
import * as React from 'react'
import { MessageSquare, Sparkles } from 'lucide-react'
import { Button, cn } from '@wren/ui'

interface EmptyStateProps {
  welcomeMessage?: string | null
  tenantName?: string
  onPromptClick?: (prompt: string) => void
  className?: string
}

const DEFAULT_PROMPTS = [
  'What can you help me with?',
  'Summarise the key documents in my knowledge base.',
  'How do I get started with this platform?',
]

export function EmptyState({ welcomeMessage, tenantName, onPromptClick, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center px-8 py-16 text-center', className)}>
      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-5">
        <MessageSquare className="h-7 w-7 text-primary" />
      </div>

      {/* Heading */}
      <h2 className="text-xl font-semibold mb-2">
        {welcomeMessage
          ? welcomeMessage
          : tenantName
          ? `Welcome to ${tenantName}`
          : 'Start a conversation'}
      </h2>

      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        Ask questions, explore your knowledge base, and get instant answers from your AI assistant.
      </p>

      {/* Suggested prompts */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Try asking…
        </p>
        {DEFAULT_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            className="h-auto w-full justify-start text-left px-4 py-3 text-sm leading-snug whitespace-normal"
            onClick={() => onPromptClick?.(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}
