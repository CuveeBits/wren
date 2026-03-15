/**
 * Prompt execution engine — Sprint 1 + Sprint 2.
 *
 * Renders a Handlebars template with user-supplied variables and streams
 * the result from LiteLLM via SSE-friendly AsyncGenerator.
 *
 * Sprint 2 additions (F-05):
 * - systemMessage?: optional system prompt prepended before user message
 *   (used to inject KB context chunks)
 *
 * Architecture: ADR-005 / ADR-016
 * Rule 2: this is the ONLY place that calls LiteLLM; imported by apps/api routes.
 */
import Handlebars from 'handlebars'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { z } from 'zod'
import { MODELS } from './models'

// ─── Register Handlebars helpers ─────────────────────────────────────────────

Handlebars.registerHelper('uppercase', (value: unknown) =>
  typeof value === 'string' ? value.toUpperCase() : value
)
Handlebars.registerHelper('lowercase', (value: unknown) =>
  typeof value === 'string' ? value.toLowerCase() : value
)
Handlebars.registerHelper('trim', (value: unknown) =>
  typeof value === 'string' ? value.trim() : value
)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExecuteOptions {
  promptTemplate: string
  variables: Record<string, string>
  /** LiteLLM base URL, e.g. http://localhost:4000 */
  litellmBaseUrl: string
  /** LiteLLM API key */
  litellmApiKey: string
  /** Model ID to use. Defaults to REASONING (claude-sonnet-4). */
  modelId?: string
  /** Max tokens. Defaults to 2000. */
  maxTokens?: number
  /**
   * Sprint 2 (F-05): Optional system message injected before the user message.
   * Used to prepend retrieved KB chunks as context.
   */
  systemMessage?: string
  stream: true
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error' | 'citations'
  content?: string
  tokenCount?: number
  message?: string
  /** Sprint 2 (F-05): citation metadata, sent as a single event before streaming starts */
  citations?: CitationRef[]
}

export interface CitationRef {
  chunkId:          string
  documentId:       string
  documentTitle:    string
  documentFileName: string
  excerpt:          string
  pageNumber?:      number
  chunkIndex:       number
}

const ExecuteOptionsSchema = z.object({
  promptTemplate: z.string().min(1),
  variables: z.record(z.string()),
  litellmBaseUrl: z.string().url(),
  litellmApiKey: z.string().min(1),
  modelId: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  systemMessage: z.string().optional(),
})

// ─── Execution engine ─────────────────────────────────────────────────────────

/**
 * Renders a Handlebars template with the provided variables and streams
 * the LLM response as an AsyncGenerator of StreamChunk objects.
 *
 * Usage in Fastify SSE route:
 *   for await (const chunk of executePrompt(options)) {
 *     reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
 *   }
 */
export async function* executePrompt(
  options: ExecuteOptions
): AsyncGenerator<StreamChunk> {
  // Validate options
  const validated = ExecuteOptionsSchema.safeParse(options)
  if (!validated.success) {
    yield {
      type: 'error',
      message: `Invalid execute options: ${validated.error.message}`,
    }
    return
  }

  // 1. Render Handlebars template
  let renderedPrompt: string
  try {
    const template = Handlebars.compile(options.promptTemplate, {
      noEscape: true,
    })
    renderedPrompt = template(options.variables)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    yield { type: 'error', message: `Template render error: ${message}` }
    return
  }

  // 2. Build LiteLLM client (OpenAI-compatible API)
  // Rule 2: we call LiteLLM proxy, not any provider directly.
  const client = new OpenAI({
    baseURL: options.litellmBaseUrl,
    apiKey: options.litellmApiKey,
  })

  const model = options.modelId ?? MODELS.REASONING
  const maxTokens = options.maxTokens ?? 2000

  // Build message array — prepend system message if KB context provided (F-05)
  const messages: ChatCompletionMessageParam[] = []
  if (options.systemMessage) {
    messages.push({ role: 'system', content: options.systemMessage })
  }
  messages.push({ role: 'user', content: renderedPrompt })

  // 3. Stream from LiteLLM with a 120s timeout
  let tokenCount = 0
  try {
    const stream = await Promise.race<
      AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
    >([
      client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        stream: true,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LiteLLM request timed out after 120s')), 120_000)
      ),
    ])

    for await (const event of stream) {
      const delta = event.choices[0]?.delta?.content
      if (delta) {
        yield { type: 'chunk', content: delta }
      }
      const usage = (event as { usage?: { total_tokens?: number } }).usage
      if (usage?.total_tokens) {
        tokenCount = usage.total_tokens
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    yield { type: 'error', message }
    return
  }

  // 4. Final done event
  yield { type: 'done', tokenCount }
}
