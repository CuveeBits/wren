/**
 * i18n-chat.ts — Language registry for Wren.
 *
 * SUPPORTED_LANGUAGES is the single source of truth for all available locales.
 * Used by: LanguageSelector, translation API (F-04/F-05), chat translation (Sprint 4),
 * and UI localisation (Sprint 4b).
 *
 * Sprint 4: SupportedLanguage interface + LANGUAGE_AUTO + LANGUAGE_LABEL + LANGUAGE_ENGLISH_NAME
 * Sprint 4b: Extended SUPPORTED_LANGUAGES list + Language alias + nativeName field
 */

/** Sprint 4 interface — used by LanguageSelector, MessageBubble, ChatComposer */
export interface SupportedLanguage {
  /** ISO 639-1 code */
  code: string
  /** Native display name */
  label: string
  /** English name (for aria/tooltips) */
  englishName: string
  /** Alias — same as label, used by Sprint 4b profile page */
  nativeName: string
  /** Alias — same as englishName, used by Sprint 4b API */
  name: string
}

/** Alias for Sprint 4b code that uses Language type */
export type Language = SupportedLanguage

/** 'auto' sentinel — let the backend detect the language */
export const LANGUAGE_AUTO = 'auto' as const

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English',    englishName: 'English',    nativeName: 'English',    name: 'English' },
  { code: 'de', label: 'Deutsch',    englishName: 'German',     nativeName: 'Deutsch',    name: 'German' },
  { code: 'fr', label: 'Français',   englishName: 'French',     nativeName: 'Français',   name: 'French' },
  { code: 'cs', label: 'Čeština',    englishName: 'Czech',      nativeName: 'Čeština',    name: 'Czech' },
  { code: 'pl', label: 'Polski',     englishName: 'Polish',     nativeName: 'Polski',     name: 'Polish' },
  { code: 'es', label: 'Español',    englishName: 'Spanish',    nativeName: 'Español',    name: 'Spanish' },
  { code: 'it', label: 'Italiano',   englishName: 'Italian',    nativeName: 'Italiano',   name: 'Italian' },
  { code: 'pt', label: 'Português',  englishName: 'Portuguese', nativeName: 'Português',  name: 'Portuguese' },
  { code: 'nl', label: 'Nederlands', englishName: 'Dutch',      nativeName: 'Nederlands', name: 'Dutch' },
  { code: 'sk', label: 'Slovenčina', englishName: 'Slovak',     nativeName: 'Slovenčina', name: 'Slovak' },
  { code: 'hu', label: 'Magyar',     englishName: 'Hungarian',  nativeName: 'Magyar',     name: 'Hungarian' },
  { code: 'ro', label: 'Română',     englishName: 'Romanian',   nativeName: 'Română',     name: 'Romanian' },
  { code: 'sv', label: 'Svenska',    englishName: 'Swedish',    nativeName: 'Svenska',    name: 'Swedish' },
  { code: 'da', label: 'Dansk',      englishName: 'Danish',     nativeName: 'Dansk',      name: 'Danish' },
  { code: 'fi', label: 'Suomi',      englishName: 'Finnish',    nativeName: 'Suomi',      name: 'Finnish' },
  { code: 'nb', label: 'Norsk',      englishName: 'Norwegian',  nativeName: 'Norsk',      name: 'Norwegian' },
  { code: 'ja', label: '日本語',      englishName: 'Japanese',   nativeName: '日本語',      name: 'Japanese' },
  { code: 'zh', label: '中文',        englishName: 'Chinese Simplified', nativeName: '中文', name: 'Chinese Simplified' },
  { code: 'ko', label: '한국어',      englishName: 'Korean',     nativeName: '한국어',      name: 'Korean' },
  { code: 'ar', label: 'العربية',    englishName: 'Arabic',     nativeName: 'العربية',    name: 'Arabic' },
  { code: 'tr', label: 'Türkçe',     englishName: 'Turkish',    nativeName: 'Türkçe',     name: 'Turkish' },
  { code: 'uk', label: 'Українська', englishName: 'Ukrainian',  nativeName: 'Українська', name: 'Ukrainian' },
  { code: 'ru', label: 'Русский',    englishName: 'Russian',    nativeName: 'Русский',    name: 'Russian' },
]

/** Map from ISO 639-1 code → native label */
export const LANGUAGE_LABEL: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label])
)

/** Map from ISO 639-1 code → English name (for badges etc.) */
export const LANGUAGE_ENGLISH_NAME: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.englishName])
)

/** Sprint 4b helpers */
export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)
}

export function isSupported(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code)
}
