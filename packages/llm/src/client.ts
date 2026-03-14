/**
 * LiteLLM client wrapper — Sprint 0 stub.
 *
 * In Sprint 0 this is a stub: the LiteLLM Docker service is live but no actual
 * LLM calls are made from application code yet. The full implementation ships in Sprint 2.
 *
 * Architecture (ADR-005):
 * - Uses the OpenAI SDK configured to point at the LiteLLM proxy (OpenAI-compatible API).
 * - This is NOT a violation of Rule 2 — we are calling LiteLLM, not OpenAI directly.
 *   The LiteLLM proxy is our unified gateway that routes to whichever provider is configured.
 */
import OpenAI, { type ClientOptions } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { z } from 'zod'
import type { ModelId } from './models'

// ─── Config validation (Rule 7: env vars only in config) ─────────────────────

const LiteLLMConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
})

export type LiteLLMConfig = z.infer<typeof LiteLLMConfigSchema>

// ─── Request / Response types ─────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
}

export interface ChatCompletionRequest {
  model: ModelId | string
  messages: ChatMessage[]
  tenantId: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatCompletionUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage: ChatCompletionUsage
  /** Estimated cost in USD — Rule 10 (CONTRIBUTING.md) */
  costUsd: number
}

export interface EmbeddingRequest {
  input: string | string[]
  tenantId: string
}

export interface EmbeddingResponse {
  embeddings: number[][]
  usage: { totalTokens: number }
}

// ─── LiteLLM Client ──────────────────────────────────────────────────────────

export class LiteLLMClient {
  private readonly openai: OpenAI

  constructor(config: LiteLLMConfig) {
    const validated = LiteLLMConfigSchema.parse(config)
    const opts: ClientOptions = {
      baseURL: validated.baseUrl,
      apiKey: validated.apiKey,
    }
    this.openai = new OpenAI(opts)
  }

  /**
   * Send a chat completion request through LiteLLM.
   * Sprint 0: stub that validates config is set. Full impl in Sprint 2.
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // TODO(sprint-2): implement full chat completion with streaming support
    // Cast our internal ChatMessage to OpenAI's discriminated union type.
    // This is safe because LiteLLM accepts the same message format as OpenAI.
    const messages = request.messages as unknown as ChatCompletionMessageParam[]

    const response = await this.openai.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    })

    const choice = response.choices[0]
    if (!choice?.message.content) {
      throw new Error('LiteLLM returned empty response')
    }

    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    return {
      content: choice.message.content,
      model: response.model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      // Sprint 2: implement proper cost calculation per model pricing
      costUsd: 0,
    }
  }

  /**
   * Generate embeddings through LiteLLM.
   * Sprint 0: stub. Full impl in Sprint 3 (KB indexing).
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // TODO(sprint-3): implement embedding generation for KB indexing
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: request.input,
    })

    return {
      embeddings: response.data.map((d) => d.embedding),
      usage: { totalTokens: response.usage.total_tokens },
    }
  }

  /** Ping LiteLLM proxy to verify it's reachable. Used by GET /health. */
  async ping(): Promise<boolean> {
    try {
      // LiteLLM exposes a /health endpoint
      const url = (this.openai.baseURL ?? '').replace(/\/v1\/?$/, '') + '/health'
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _client: LiteLLMClient | null = null

/**
 * Get the LiteLLM client singleton.
 * Config is read from env vars at first call; validated once.
 * Rule 7: env vars are NOT accessed here — pass config explicitly from app config.ts.
 */
export function createLiteLLMClient(config: LiteLLMConfig): LiteLLMClient {
  if (!_client) {
    _client = new LiteLLMClient(config)
  }
  return _client
}
