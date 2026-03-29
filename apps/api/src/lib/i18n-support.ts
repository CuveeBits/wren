/**
 * i18n-support.ts — supported locales list for the API.
 * Sprint 4b: used by locale routes to validate requested locale codes.
 * Sprint 4c: adds getLanguageInstruction() for language-aware LLM responses.
 * Mirrors apps/web/src/lib/i18n-chat.ts.
 */

export const SUPPORTED_LOCALE_CODES = new Set([
  'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'sk',
  'hu', 'ro', 'sv', 'da', 'fi', 'nb', 'ja', 'zh', 'ko', 'ar',
  'tr', 'uk', 'ru',
])

export function isSupported(locale: string): boolean {
  return SUPPORTED_LOCALE_CODES.has(locale)
}

// ─── Sprint 4c: F-06 — Language instruction helper ───────────────────────────

/**
 * Native language names for LLM instruction injection.
 * Using native names (e.g. "Deutsch" not "German") improves LLM compliance.
 * Inline map — no external packages needed.
 */
const NATIVE_NAMES: Record<string, string> = {
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  cs: 'Čeština',
  sk: 'Slovenčina',
  hu: 'Magyar',
  ro: 'Română',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  nb: 'Norsk',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  tr: 'Türkçe',
  uk: 'Українська',
  ru: 'Русский',
}

/**
 * Returns a system instruction to make the LLM respond in the user's language.
 * Returns "" for English (no instruction needed — LLM defaults to English).
 *
 * @param locale - ISO 639-1 locale code (e.g. "de", "fr", "en")
 * @returns Instruction string, e.g. "Always respond in Deutsch." or ""
 */
export function getLanguageInstruction(locale: string): string {
  if (!locale || locale === 'en') return ''
  const nativeName = NATIVE_NAMES[locale]
  if (!nativeName) return ''
  return `Always respond in ${nativeName}.`
}
