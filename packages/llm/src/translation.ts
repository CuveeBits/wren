/**
 * TranslationService — Sprint 4 (F-02).
 *
 * GDPR-native auto-translation via local Ollama (qwen2.5:1.5b aliased as "translation").
 * No data leaves the stack — all translation goes through LiteLLM → Ollama.
 *
 * ADR-005: every call goes through LiteLLM proxy, never directly to any LLM SDK.
 * Rule 2: this file is inside @wren/llm — the only permitted LLM call site.
 * Rule 14: no fallback for required env vars — config must be supplied explicitly.
 */
import OpenAI from 'openai'
import { z } from 'zod'

// ─── Config ──────────────────────────────────────────────────────────────────

const TranslationConfigSchema = z.object({
  litellmBaseUrl: z.string().url(),
  litellmApiKey: z.string().min(1),
})

export type TranslationConfig = z.infer<typeof TranslationConfigSchema>

// LiteLLM model alias for translation — maps to qwen2.5:1.5b (F-05)
const TRANSLATION_MODEL = 'translation'

// Low temperature: translation must be faithful, not creative
const TRANSLATION_TEMPERATURE = 0.1

// Timeout per translation call (ms)
const TRANSLATION_TIMEOUT_MS = 300_000

// ─── Language detection ───────────────────────────────────────────────────────

/**
 * Detect the language of the provided text.
 * Returns an ISO 639-1 two-letter code (e.g. "de", "fr", "en").
 *
 * Graceful degradation: returns "en" on any error so the caller can proceed.
 */
export async function detectLanguage(
  text: string,
  config: TranslationConfig
): Promise<string> {
  const validated = TranslationConfigSchema.parse(config)
  const client = new OpenAI({
    baseURL: validated.litellmBaseUrl,
    apiKey: validated.litellmApiKey,
  })

  try {
    const response = await Promise.race<OpenAI.Chat.Completions.ChatCompletion>([
      client.chat.completions.create({
        model: TRANSLATION_MODEL,
        temperature: TRANSLATION_TEMPERATURE,
        max_tokens: 4,
        messages: [
          {
            role: 'system',
            content:
              'You are a language detector. Reply with ONLY the ISO 639-1 two-letter language code (e.g. "en", "de", "fr", "cs", "pl"). No other words.',
          },
          {
            role: 'user',
            content: `What language is this text? Reply with the ISO 639-1 code only.\n\n"${text.slice(0, 200)}"`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Language detection timed out')), TRANSLATION_TIMEOUT_MS)
      ),
    ])

    const raw = response.choices[0]?.message?.content?.trim().toLowerCase() ?? ''
    // Extract the first 2-letter code from the response
    const match = raw.match(/^[a-z]{2}/)
    if (match) return match[0]

    console.warn('[TranslationService] detectLanguage: unexpected response format:', raw)
    return 'en'
  } catch (err) {
    console.warn('[TranslationService] detectLanguage failed, defaulting to "en":', err)
    return 'en'
  }
}

// ─── Translation ──────────────────────────────────────────────────────────────

/**
 * Translate text from one language to another via LiteLLM → Ollama.
 *
 * Graceful degradation: if translation fails for any reason (timeout, LLM refusal,
 * empty response), the original text is returned with a warning log so the user
 * always gets a response even if translation is unavailable.
 *
 * @param text     - Text to translate
 * @param fromLang - ISO 639-1 source language code (e.g. "de")
 * @param toLang   - ISO 639-1 target language code (e.g. "en")
 * @param config   - LiteLLM connection config
 */
export async function translate(
  text: string,
  fromLang: string,
  toLang: string,
  config: TranslationConfig
): Promise<string> {
  // Nothing to do if same language
  if (fromLang === toLang) return text

  const validated = TranslationConfigSchema.parse(config)
  const client = new OpenAI({
    baseURL: validated.litellmBaseUrl,
    apiKey: validated.litellmApiKey,
  })

  try {
    const response = await Promise.race<OpenAI.Chat.Completions.ChatCompletion>([
      client.chat.completions.create({
        model: TRANSLATION_MODEL,
        temperature: TRANSLATION_TEMPERATURE,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content:
              `You are a professional translator. Translate the user's message from ${fromLang} to ${toLang}. ` +
              'Output ONLY the translated text. Do not add explanations, notes, or quotation marks.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Translation timed out')), TRANSLATION_TIMEOUT_MS)
      ),
    ])

    const translated = response.choices[0]?.message?.content?.trim()

    if (!translated) {
      console.warn('[TranslationService] translate: empty response from LLM, returning original text')
      return text
    }

    return translated
  } catch (err) {
    // Graceful degradation — Rule: translation failure must never break the chat flow
    console.warn(
      `[TranslationService] translate (${fromLang}→${toLang}) failed, returning original text:`,
      err
    )
    return text
  }
}

// ─── Sprint 4b: TranslationService class ─────────────────────────────────────

/**
 * TranslationService — Sprint 4b.
 *
 * Class-based wrapper around the existing translate() and detectLanguage() functions.
 * Adds translateJson() for bulk UI string translation.
 *
 * ADR-005: all calls go through LiteLLM proxy.
 * Rule 2: this file is inside @wren/llm — the only permitted LLM call site.
 */
import { createLiteLLMClient } from './client'

export class TranslationService {
  private client: ReturnType<typeof createLiteLLMClient>

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.client = createLiteLLMClient(config)
  }

  async detectLanguage(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return 'en'
    try {
      const response = await this.client.chat({
        model: TRANSLATION_MODEL,
        tenantId: 'system',
        messages: [
          {
            role: 'system',
            content:
              'You are a language detection assistant. Respond ONLY with the ISO 639-1 language code (2 letters, lowercase). Examples: en, de, fr, cs, pl. Nothing else.',
          },
          {
            role: 'user',
            content: `What language is this text written in? Text: "${text.slice(0, 200)}"`,
          },
        ],
        temperature: 0.1,
        maxTokens: 5,
      })
      const code = (response.content ?? 'en')
        .trim()
        .toLowerCase()
        .slice(0, 2)
      return /^[a-z]{2}$/.test(code) ? code : 'en'
    } catch {
      return 'en'
    }
  }

  async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    if (!text || text.trim().length === 0) return text
    if (fromLang === toLang) return text
    try {
      const response = await this.client.chat({
        model: TRANSLATION_MODEL,
        tenantId: 'system',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. Return ONLY the translated text, nothing else. Preserve formatting, line breaks, and markdown if present.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
      })
      const translated = response.content ?? ''
      return translated.trim() || text
    } catch {
      return text
    }
  }

  /**
   * translatePrompts — Sprint 4c (F-02).
   * Translates an array of prompts (id + title + description) in a single LLM call.
   * Flattens to "promptId::title" / "promptId::description" keys, calls translateJson(),
   * then reconstructs into nested output.
   * Returns Record<promptId, { title: string, description: string }>.
   */
  async translatePrompts(
    prompts: Array<{ id: string; title: string; description?: string | null }>,
    toLang: string
  ): Promise<Record<string, { title: string; description: string }>> {
    if (toLang === 'en') {
      return Object.fromEntries(
        prompts.map((p) => [p.id, { title: p.title, description: p.description ?? '' }])
      )
    }

    // Flatten to "promptId::title" / "promptId::description"
    const flat: Record<string, string> = {}
    for (const p of prompts) {
      flat[`${p.id}::title`] = p.title
      if (p.description) {
        flat[`${p.id}::description`] = p.description
      }
    }

    const translated = await this.translateJson(flat, toLang)

    // Reconstruct
    const result: Record<string, { title: string; description: string }> = {}
    for (const p of prompts) {
      result[p.id] = {
        title: translated[`${p.id}::title`] ?? p.title,
        description: translated[`${p.id}::description`] ?? p.description ?? '',
      }
    }
    return result
  }

  /**
   * translateJson — Sprint 4b (F-04).
   * Translates an entire flat JSON object of UI strings in a single LLM call.
   * Returns a translated Record<string, string> with the same keys.
   * Falls back to the original messages on parse error.
   */
  async translateJson(
    messages: Record<string, string>,
    toLang: string
  ): Promise<Record<string, string>> {
    if (toLang === 'en') return messages
    try {
      const enJson = JSON.stringify(messages, null, 2)
      const response = await this.client.chat({
        model: TRANSLATION_MODEL,
        tenantId: 'system',
        messages: [
          {
            role: 'system',
            content: `You are a professional UI translator. You will receive a JSON object where each value is a UI string in English. Translate ALL values to ${toLang}. Return ONLY the valid JSON object with the same keys and translated values. Do NOT change the keys. Do NOT add any explanation or markdown fences. Return pure JSON only.`,
          },
          {
            role: 'user',
            content: enJson,
          },
        ],
        temperature: 0.1,
      })
      const raw = (response.content ?? '').trim()
      // Strip potential markdown code fences
      const cleaned = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
      return JSON.parse(cleaned) as Record<string, string>
    } catch {
      // Graceful degradation — return English on any error
      return messages
    }
  }
}

let _instance: TranslationService | null = null

export function getTranslationService(): TranslationService {
  if (!_instance) {
    const baseUrl = process.env['LITELLM_BASE_URL'] ?? 'http://localhost:4000'
    const apiKey = process.env['LITELLM_API_KEY'] ?? 'sk-dev-master-key'
    _instance = new TranslationService({ baseUrl, apiKey })
  }
  return _instance
}

// ─── Sprint 4c: translatePrompts() standalone ────────────────────────────────

/**
 * translatePrompts() — Sprint 4c (F-02) standalone helper.
 * Delegates to the TranslationService singleton.
 * Use this for one-off calls without needing to manage a service instance.
 */
export async function translatePrompts(
  prompts: Array<{ id: string; title: string; description?: string | null }>,
  toLang: string
): Promise<Record<string, { title: string; description: string }>> {
  return getTranslationService().translatePrompts(prompts, toLang)
}
