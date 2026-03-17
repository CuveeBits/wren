'use client'

/**
 * C-03 (brief): NewConversationButton — creates a new conversation and navigates to it.
 *
 * Calls POST /api/v1/chat/conversations (S-01).
 * On success, navigates to /[tenantSlug]/chat/[id].
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@wren/ui'
import { createConversation } from './api'

interface NewConversationButtonProps {
  tenantSlug: string
  onCreated?: () => void
}

export function NewConversationButton({ tenantSlug, onCreated }: NewConversationButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  async function handleClick() {
    setIsPending(true)
    try {
      const conv = await createConversation({ channel: 'app' })
      if (conv) {
        onCreated?.()
        router.push(`/${tenantSlug}/chat/${conv.id}`)
      }
    } catch {
      // no-op — user stays on current page
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      New conversation
    </Button>
  )
}
