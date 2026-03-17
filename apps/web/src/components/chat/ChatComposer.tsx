'use client'

/**
 * C-06 (sprint brief) / C-08: ChatComposer
 *
 * Multiline textarea (shift+enter = newline, enter = submit).
 * Submit disabled while SSE stream is active.
 * Shows attached doc count pill with KB picker trigger.
 */
import * as React from 'react'
import { Send, Paperclip, X, Loader2 } from 'lucide-react'
import { Button, cn } from '@wren/ui'
import type { KbDocument } from '@/components/kb/api'

interface ChatComposerProps {
  onSend: (content: string) => void
  isStreaming: boolean
  attachedDocs: KbDocument[]
  onOpenPicker: () => void
  onDetachDoc?: (docId: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatComposer({
  onSend,
  isStreaming,
  attachedDocs,
  onOpenPicker,
  onDetachDoc,
  disabled,
  placeholder = 'Ask anything…',
}: ChatComposerProps) {
  const [value, setValue] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const content = value.trim()
    if (!content || isStreaming || disabled) return
    onSend(content)
    setValue('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {/* Attached docs pills */}
      {attachedDocs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-1 rounded-full border border-border bg-accent px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              <span className="truncate max-w-[150px]">{doc.title}</span>
              {onDetachDoc && (
                <button
                  type="button"
                  onClick={() => onDetachDoc(doc.id)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${doc.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Textarea row */}
      <div className="flex items-end gap-2">
        {/* KB picker button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 mb-0.5"
          onClick={onOpenPicker}
          disabled={disabled}
          aria-label="Attach KB documents"
          title="Attach KB documents"
        >
          <Paperclip className="h-4 w-4" />
          {attachedDocs.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {attachedDocs.length}
            </span>
          )}
        </Button>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Responding…' : placeholder}
            disabled={isStreaming || disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[40px] max-h-[200px] overflow-y-auto'
            )}
            aria-label="Message input"
          />
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 mb-0.5"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          title="Send message"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
