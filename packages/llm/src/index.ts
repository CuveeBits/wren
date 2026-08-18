/**
 * @wren/llm — LLM Gateway.
 *
 * THE ONLY PLACE in the codebase that talks to any LLM provider.
 * All other packages and apps import from here. Never import from openai,
 * @anthropic-ai/sdk, or any other LLM SDK directly (Rule 2, CONTRIBUTING.md).
 *
 * Architecture: ADR-005 — all calls go through LiteLLM proxy.
 */
export { MODELS } from './models'
export type { ModelId } from './models'

export { LiteLLMClient, createLiteLLMClient } from './client'
export type {
  LiteLLMConfig,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionUsage,
  EmbeddingRequest,
  EmbeddingResponse,
} from './client'

export { executePrompt } from './execute'
export type { ExecuteOptions, StreamChunk } from './execute'

export type { CitationRef } from './execute'

// Sprint 4: TranslationService — GDPR-native auto-translation via Ollama
export { detectLanguage, translate } from './translation'
export type { TranslationConfig } from './translation'

// Sprint 4b: TranslationService class + getTranslationService + translateJson
export { TranslationService, getTranslationService } from './translation'

// Sprint 4c: translatePrompts() standalone helper
export { translatePrompts } from './translation'
