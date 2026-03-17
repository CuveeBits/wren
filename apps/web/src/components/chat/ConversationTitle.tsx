'use client'

/**
 * C-11 (sprint brief): ConversationTitle — inline editable title.
 *
 * Displays the conversation title (or a placeholder from the first user message).
 * Click to edit inline. Blur or Enter commits. Escape cancels.
 * Calls PATCH /api/v1/chat/conversations/:id (S-02) on commit.
 */
import * as React from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@wren/ui'
import { updateConversation } from './api'

interface ConversationTitleProps {
  conversationId: string
  title: string | null
  /** Fallback placeholder when title is null (e.g. first 40 chars of first user message) */
  placeholder?: string
  onUpdated?: (newTitle: string) => void
  className?: string
}

export function ConversationTitle({
  conversationId,
  title,
  placeholder = 'New conversation',
  onUpdated,
  className,
}: ConversationTitleProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(title ?? '')
  const [isSaving, setIsSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.select()
    }
  }, [isEditing])

  // Sync when prop changes (async title generation from backend)
  React.useEffect(() => {
    if (!isEditing) setEditValue(title ?? '')
  }, [title, isEditing])

  function startEdit() {
    setEditValue(title ?? '')
    setIsEditing(true)
  }

  function cancelEdit() {
    setEditValue(title ?? '')
    setIsEditing(false)
  }

  async function commitEdit() {
    const newTitle = editValue.trim()
    if (!newTitle || newTitle === title) {
      cancelEdit()
      return
    }
    setIsSaving(true)
    try {
      await updateConversation(conversationId, { title: newTitle })
      onUpdated?.(newTitle)
      setIsEditing(false)
    } catch {
      cancelEdit()
    } finally {
      setIsSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          disabled={isSaving}
          className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring min-w-0"
          maxLength={120}
          aria-label="Conversation title"
        />
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                commitEdit()
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Save title"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                cancelEdit()
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        'group flex items-center gap-1.5 rounded px-1 -ml-1 hover:bg-accent transition-colors text-left',
        className
      )}
      aria-label="Edit conversation title"
      title="Click to edit title"
    >
      <span className="truncate text-sm font-semibold">
        {title ?? <span className="text-muted-foreground italic">{placeholder}</span>}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
