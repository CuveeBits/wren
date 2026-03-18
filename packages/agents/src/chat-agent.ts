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
import type Redis from 'ioredis'
import { createLiteLLMClient, MODELS } from '@wren/llm'
import { ContextManager } from './context-manager'
import { assembleMessages } from './prompt-assembler'
import type { ConversationContext, AgentStreamChunk } from './types'

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

    // ADR-005: all LLM calls through @wren/llm — never instantiate OpenAI directly
    const client = createLiteLLMClient({ baseUrl: litellmBaseUrl, apiKey: litellmApiKey })

    const model = modelId ?? MODELS.REASONING

    let fullContent = ''
    let tokenInput = 0
    let tokenOutput = 0

    try {
      // Use LiteLLMClient.chat for streaming — build messages in @wren/llm ChatMessage format
      const chatMessages = messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }))

      // Stream tokens as they arrive from LiteLLM — true streaming via @wren/llm client.stream()
      // ADR-005 compliant: all LLM calls go through packages/llm → LiteLLM proxy.
      const abortTimeout = setTimeout(() => {
        throw new Error('LiteLLM stream timed out after 120s')
      }, 120_000)

      try {
        for await (const chunk of client.stream({
          model,
          messages: chatMessages,
          tenantId,
          maxTokens,
        })) {
          fullContent += chunk
          tokenOutput++
          yield { type: 'chunk', content: chunk }
        }
      } finally {
        clearTimeout(abortTimeout)
      }

      // Estimate token counts (LiteLLM streaming does not return usage in all providers)
      tokenInput = chatMessages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)
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
