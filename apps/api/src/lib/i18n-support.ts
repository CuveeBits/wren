/**
 * i18n-support.ts — supported locales list for the API.
 * Sprint 4b: used by locale routes to validate requested locale codes.
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
