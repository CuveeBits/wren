/**
 * ChatAgent — Sprint 3 (F-03).
 *
 * Custom agent runtime for multi-turn chat conversations.
 * Wires together: ContextManager (Redis) + PromptAssembler + LiteLLM gateway.
 *
 * ADR compliance (non-negotiable):
 * - ALL LLM calls via @wren/llm → LiteLLM proxy (ADR-005)
 * - No LangChain, no CrewAI, no direct SDK calls (ADR-007)
 * - Accepts tenantId, userId, conversationId on every call (ADR-007)
 *
 * /packages/agents must NOT import from /packages/channels.
 */
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type Redis from 'ioredis'
import { ContextManager } from './context-manager'
import { assembleMessages } from './prompt-assembler'
import type { ConversationContext, AgentStreamChunk } from './types'
import { MODELS } from '@wren/llm'

export interface ChatAgentOptions {
  redis: Redis
  context: ConversationContext
}

/**
 * ChatAgent — multi-turn streaming agent.
 *
 * Usage:
 *   const agent = new ChatAgent({ redis, context })
 *   for await (const chunk of agent.stream(userMessage)) {
 *     // handle chunk
 *   }
 */
export class ChatAgent {
  private readonly contextManager: ContextManager
  private readonly context: ConversationContext

  constructor(opts: ChatAgentOptions) {
    this.contextManager = new ContextManager(opts.redis)
    this.context = opts.context
  }

  /**
   * Stream a response for the given user message.
   * Yields AgentStreamChunk events.
   *
   * After streaming completes, persists the full turn to Redis context.
   */
  async *stream(userMessage: string): AsyncGenerator<AgentStreamChunk> {
    const {
      tenantId,
      conversationId,
      systemPromptSnapshot,
      kbChunks,
      litellmBaseUrl,
      litellmApiKey,
      modelId,
      maxTokens = 2000,
    } = this.context

    // Load conversation history from Redis
    const history = await this.contextManager.load(tenantId, conversationId)

    // Assemble message array
    const messages = assembleMessages({
      systemPromptSnapshot,
      kbChunks,
      history,
      userMessage,
    })

    // LiteLLM client (OpenAI-compatible API to LiteLLM proxy — NOT calling OpenAI directly)
    // Rule 2: this calls LiteLLM proxy, not any provider directly.
    const client = new OpenAI({
      baseURL: litellmBaseUrl,
      apiKey: litellmApiKey,
    })

    const model = modelId ?? MODELS.REASONING

    let fullContent = ''
    let tokenInput = 0
    let tokenOutput = 0

    try {
      const stream = await Promise.race<
        AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
      >([
        client.chat.completions.create({
          model,
          messages: messages as ChatCompletionMessageParam[],
          max_tokens: maxTokens,
          stream: true,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('LiteLLM request timed out after 60s')),
            60_000
          )
        ),
      ])

      for await (const event of stream) {
        const delta = event.choices[0]?.delta?.content
        if (delta) {
          fullContent += delta
          yield { type: 'chunk', content: delta }
        }

        // Capture usage if provided (LiteLLM sends on final chunk)
        const usage = (event as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage
        if (usage) {
          tokenInput = usage.prompt_tokens ?? 0
          tokenOutput = usage.completion_tokens ?? 0
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      yield { type: 'error', message }
      return
    }

    // Persist turn to Redis context (both user and assistant messages)
    await this.contextManager.persistTurn(tenantId, conversationId, userMessage, fullContent)

    yield { type: 'done', tokenInput, tokenOutput }
  }
}
