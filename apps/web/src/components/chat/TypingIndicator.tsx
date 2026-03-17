'use client'

/**
 * C-07 (brief): TypingIndicator — animated dots while streaming.
 *
 * Shown when SSE stream is open and first chunk has not yet arrived.
 * Hidden once first chunk arrives (streaming bubble replaces it).
 */
import { cn } from '@wren/ui'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-start gap-2 px-4 py-1', className)}>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
