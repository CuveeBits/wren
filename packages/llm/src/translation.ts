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
const TRANSLATION_TIMEOUT_MS = 30_000

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
