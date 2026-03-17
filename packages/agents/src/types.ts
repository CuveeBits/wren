/**
 * Agent runtime types — Sprint 3.
 *
 * ConversationContext is the primary input to ChatAgent.
 * All fields required for KB retrieval, prompt assembly, and memory.
 *
 * Note: KbChunkResult is defined here (mirroring the retrieval service shape)
 * to avoid cross-app imports — /packages/agents must not import from /apps/api.
 */

export interface KbChunkResult {
  id:               string
  documentId:       string
  content:          string
  tokenCount:       number
  chunkIndex:       number
  pageNumber:       number | null
  similarity:       number
  documentTitle:    string
  documentFileName: string
}

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
  kbChunks?: KbChunkResult[]
  /** Citation metadata corresponding to kbChunks */
  citations?: CitationRef[]
  /** LiteLLM gateway config — passed through from API config */
  litellmBaseUrl: string
  litellmApiKey: string
  /** Model override — defaults to configured default in models registry */
  modelId?: string
  /** Max tokens per turn — defaults to 2000 */
  maxTokens?: number
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
