/**
 * Model registry — ADR-005.
 *
 * CRITICAL RULE (ADR-005): All LLM calls go through this package → LiteLLM proxy.
 * No code outside this package may import from openai, @anthropic-ai/sdk, or any LLM SDK.
 *
 * Tenants can override model selection.
 * Enterprise tenants can point to their own Ollama instance.
 */

export const MODELS = {
  /** Fast, cost-efficient. Use for: classification, extraction, simple Q&A. */
  FAST: 'gpt-4o-mini',
  /** Standard quality. Use for: most agent interactions. */
  STANDARD: 'gpt-4o',
  /** Reasoning-heavy tasks. Use for: complex analysis, code generation. */
  REASONING: 'claude-sonnet-4',
  /** Embedding generation. text-embedding-3-small (1536 dims). */
  EMBEDDINGS: 'text-embedding-3-small',
  /** Local fast model. Use for: dev/testing without API costs. */
  LOCAL_FAST: 'ollama/llama3.2',
} as const

export type ModelId = (typeof MODELS)[keyof typeof MODELS]
