/**
 * Prompt execution engine — Sprint 1.
 *
 * Renders a Handlebars template with user-supplied variables and streams
 * the result from LiteLLM via SSE-friendly AsyncGenerator.
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
  /** LiteLLM base URL, e.g. http://localhost:4000/v1 */
  litellmBaseUrl: string
  /** LiteLLM API key */
  litellmApiKey: string
  /** Model ID to use. Defaults to REASONING (claude-sonnet-4). */
  modelId?: string
  /** Max tokens. Defaults to 2000. */
  maxTokens?: number
  stream: true
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error'
  content?: string
  tokenCount?: number
  message?: string
}

const ExecuteOptionsSchema = z.object({
  promptTemplate: z.string().min(1),
  variables: z.record(z.string()),
  litellmBaseUrl: z.string().url(),
  litellmApiKey: z.string().min(1),
  modelId: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
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
      noEscape: true, // prompt templates are plain text, not HTML
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

  const messages: ChatCompletionMessageParam[] = [
    { role: 'user', content: renderedPrompt },
  ]

  // 3. Stream from LiteLLM with a 30s timeout
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
        setTimeout(() => reject(new Error('LiteLLM request timed out after 30s')), 30_000)
      ),
    ])

    for await (const event of stream) {
      const delta = event.choices[0]?.delta?.content
      if (delta) {
        yield { type: 'chunk', content: delta }
      }
      // Accumulate usage if provided (some LiteLLM versions include it per-chunk)
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
