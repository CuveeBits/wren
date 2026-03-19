/**
 * Agent runtime types — Sprint 3.
 *
 * ConversationContext is the primary input to ChatAgent.
 * KbChunkResult is re-exported from @wren/types to avoid cross-package duplication.
 */
export type { KbChunkResult } from '@wren/types'

export interface CitationRef {
  documentId: string
  chunkId: string
  label: string
  documentTitle: string
  documentFileName: string
  excerpt: string
  pageNumber?: number
  chunkIndex: number
}

export interface ConversationContext {
  tenantId: string
  userId: string
  conversationId: string
  channel: 'app' | 'webchat'
  /** Frozen system prompt captured at conversation creation (F-05) */
  systemPromptSnapshot?: string
  /** Pre-retrieved KB chunks (F-04) — retrieved by chat service before calling agent */
  kbChunks?: import('@wren/types').KbChunkResult[]
  /** Citation metadata corresponding to kbChunks */
  citations?: CitationRef[]
  /** LiteLLM gateway config — passed through from API config */
  litellmBaseUrl: string
  litellmApiKey: string
  /** Model override — defaults to configured default in models registry */
  modelId?: string
  /** Max tokens per turn — defaults to 2000 */
  maxTokens?: number
  // Sprint 4: Auto-translate settings — gated by translationEnabled
  /** Whether auto-translation is enabled for this tenant */
  translationEnabled?: boolean
  /** Supported languages for this tenant (ISO 639-1 codes) */
  supportedLanguages?: string[]
  /** Tenant default language (ISO 639-1) — used for response translation */
  defaultLanguage?: string
}

export interface AgentStreamChunk {
  type: 'chunk' | 'done' | 'error'
  content?: string
  tokenInput?: number
  tokenOutput?: number
  message?: string
}

export interface AgentTurnResult {
  content: string
  tokenInput: number
  tokenOutput: number
}
