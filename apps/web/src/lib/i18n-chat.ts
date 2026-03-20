/**
 * i18n-chat.ts — Language map for the 5 supported chat languages.
 * Used by LanguageSelector and translation-related UI.
 */

export interface SupportedLanguage {
  /** ISO 639-1 code */
  code: string
  /** Native display name */
  label: string
  /** English name (for aria/tooltips) */
  englishName: string
}

/** 'auto' sentinel — let the backend detect the language */
export const LANGUAGE_AUTO = 'auto' as const

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English',  englishName: 'English' },
  { code: 'de', label: 'Deutsch',  englishName: 'German' },
  { code: 'fr', label: 'Français', englishName: 'French' },
  { code: 'cs', label: 'Čeština',  englishName: 'Czech' },
  { code: 'pl', label: 'Polski',   englishName: 'Polish' },
]

/** Map from ISO 639-1 code → native label */
export const LANGUAGE_LABEL: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label])
)

/** Map from ISO 639-1 code → English name (for badges etc.) */
export const LANGUAGE_ENGLISH_NAME: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.englishName])
)
