'use client'

/**
 * LocaleProvider — wraps client tree with next-intl messages.
 * Sprint 4b: messages are fetched from TenantLocale cache via F-05 API.
 * Falls back to bundled en.json.
 */
import * as React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from './en.json'

interface LocaleProviderProps {
  children: React.ReactNode
  locale?: string
  messages?: Record<string, string>
}

export function LocaleProvider({ children, locale = 'en', messages }: LocaleProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages ?? (enMessages as Record<string, string>)}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  )
}
