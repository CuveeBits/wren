'use client'

/**
 * TranslationsContext — lightweight i18n provider for Wren.
 * Sprint 4b: replaces NextIntlClientProvider to avoid plugin requirement.
 *
 * Provides t() function for translating UI strings.
 * Supports simple {placeholder} interpolation.
 * Falls back to English on any missing key.
 */
import * as React from 'react'
import enMessages from './en.json'

type Messages = Record<string, string>

interface TranslationsContextValue {
  t: (key: string, params?: Record<string, string | number>) => string
  locale: string
  messages: Messages
}

const TranslationsContext = React.createContext<TranslationsContextValue>({
  t: (key: string) => (enMessages as Messages)[key] ?? key,
  locale: 'en',
  messages: enMessages as Messages,
})

export function useTranslations() {
  return React.useContext(TranslationsContext).t
}

export function useLocale() {
  return React.useContext(TranslationsContext).locale
}

interface TranslationsProviderProps {
  children: React.ReactNode
  locale?: string
  messages?: Messages
}

export function TranslationsProvider({
  children,
  locale = 'en',
  messages,
}: TranslationsProviderProps) {
  const msgs = messages ?? (enMessages as Messages)

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let str = msgs[key] ?? (enMessages as Messages)[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return str
    },
    [msgs]
  )

  const value = React.useMemo(() => ({ t, locale, messages: msgs }), [t, locale, msgs])

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  )
}
