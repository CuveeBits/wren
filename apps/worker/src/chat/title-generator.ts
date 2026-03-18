/**
 * Conversation title generation job — Sprint 3 (F-06).
 *
 * Triggered after first user message in a new conversation.
 * Generates a 5-word title by calling LiteLLM via @wren/llm.
 * Non-blocking: uses async BullMQ job.
 *
 * ADR-005: ALL LLM calls via /packages/llm → LiteLLM proxy.
 */
import { createLiteLLMClient, MODELS } from '@wren/llm'
import { db } from '@wren/db'

export interface TitleGenerationJobData {
  conversationId: string
  tenantId: string
  firstUserMessage: string
  litellmBaseUrl: string
  litellmApiKey: string
}

const TITLE_PROMPT = `Generate a concise title (maximum 6 words, no punctuation, no quotes) for a conversation that starts with this message:

"{message}"

Respond with only the title text. Nothing else.`

/**
 * Generate and persist a conversation title.
 * Safe to retry: uses upsert-style update, idempotent.
 */
export async function generateConversationTitle(
  data: TitleGenerationJobData
): Promise<void> {
  const { conversationId, tenantId, firstUserMessage, litellmBaseUrl, litellmApiKey } = data

  // Verify conversation still exists and belongs to tenant
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true, title: true },
  })

  if (!conv) {
    console.warn(`[title-generator] Conversation ${conversationId} not found — skipping`)
    return
  }

  // Skip if title was already set (e.g., manual override or duplicate job)
  if (conv.title) {
    console.log(`[title-generator] Conversation ${conversationId} already has title — skipping`)
    return
  }

  // ADR-005: all LLM calls through @wren/llm — never instantiate OpenAI directly
  const client = createLiteLLMClient({ baseUrl: litellmBaseUrl, apiKey: litellmApiKey })

  const prompt = TITLE_PROMPT.replace(
    '{message}',
    firstUserMessage.slice(0, 200) // cap context length
  )

  try {
    const response = await Promise.race([
      client.chat({
        model: MODELS.FAST,
        messages: [{ role: 'user', content: prompt }],
        tenantId,
        maxTokens: 30,
        temperature: 0.3,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Title generation timed out after 60s')), 60_000)
      ),
    ])

    const rawTitle = response.content.trim()
    // Sanitise: remove quotes, truncate to 80 chars
    const title = rawTitle
      .replace(/^["']|["']$/g, '')
      .replace(/\.$/, '')
      .slice(0, 80)
      .trim()

    if (title) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { title, updatedAt: new Date() },
      })
      console.log(`[title-generator] Set title for ${conversationId}: "${title}"`)
    }
  } catch (err) {
    console.error(`[title-generator] Failed for conversation ${conversationId}:`, err)
    throw err // Let BullMQ retry
  }
}
