/**
 * PromptAssembler — Sprint 3 (F-03, F-04, F-05).
 *
 * Assembles the full message array for each LLM turn:
 *   1. System message (systemPromptSnapshot + KB context)
 *   2. Recent conversation history (from Redis ContextManager)
 *   3. Current user message
 *
 * All KB citation formatting is done here.
 * No LLM calls — pure prompt construction.
 */

import type { KbChunkResult } from './types'
import type { MemoryMessage } from './context-manager'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AssembleOptions {
  systemPromptSnapshot?: string
  kbChunks?: KbChunkResult[]
  history: MemoryMessage[]
  userMessage: string
}

/**
 * Build the message array for the LLM call.
 * Returns messages in [system?, ...history, user] format.
 */
export function assembleMessages(opts: AssembleOptions): ChatMessage[] {
  const { systemPromptSnapshot, kbChunks = [], history, userMessage } = opts

  const messages: ChatMessage[] = []

  // Build system message: base prompt + KB context
  const systemParts: string[] = []

  if (systemPromptSnapshot?.trim()) {
    systemParts.push(systemPromptSnapshot.trim())
  }

  if (kbChunks.length > 0) {
    const kbContext = kbChunks
      .map((chunk, idx) => {
        const page = chunk.pageNumber != null ? `, page ${chunk.pageNumber}` : ''
        return `[${idx + 1}] Source: "${chunk.documentTitle}"${page}\n${chunk.content}`
      })
      .join('\n\n---\n\n')

    systemParts.push(
      `You have access to the following knowledge base excerpts. Use them to answer the user's question. ` +
      `Always cite sources using [N] notation when drawing from them.\n\n${kbContext}`
    )
  }

  if (systemParts.length > 0) {
    messages.push({ role: 'system', content: systemParts.join('\n\n') })
  }

  // Append conversation history
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content })
  }

  // Append current user message
  messages.push({ role: 'user', content: userMessage })

  return messages
}
