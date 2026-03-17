'use client'

/**
 * C-01 (sprint brief): /chat root page — empty state + new conversation prompt.
 *
 * Shown when no conversation is selected.
 * Displays EmptyState with suggested prompts.
 * Creating a new conversation via suggestion navigates to it.
 */
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EmptyState } from '@/components/chat/EmptyState'
import { createConversation } from '@/components/chat/api'

export default function ChatIndexPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const router = useRouter()

  async function handlePromptClick(prompt: string) {
    try {
      const conv = await createConversation({ channel: 'app' })
      if (conv) {
        // Navigate to the new conversation with the prompt pre-filled via query param
        router.push(`/${tenantSlug}/chat/${conv.id}?initialMessage=${encodeURIComponent(prompt)}`)
      }
    } catch {
      // Silently fail — user can still start manually
    }
  }

  return (
    <EmptyState
      onPromptClick={handlePromptClick}
      className="flex-1"
    />
  )
}
