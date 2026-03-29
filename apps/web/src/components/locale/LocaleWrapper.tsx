'use client'

/**
 * LocaleWrapper — fetches and applies locale translations for the dashboard.
 *
 * Sprint 4b: Reads 'wren-locale' cookie, fetches translations from API if non-English,
 * wraps children with TranslationsProvider.
 *
 * Architecture: max 1 LLM call per locale per tenant — generation is server-side cached.
 * This component only fetches pre-generated JSON from GET /api/v1/tenant/locale/:locale.
 */
import * as React from 'react'
import { TranslationsProvider } from '@/i18n/translations-context'
import enMessages from '@/i18n/en.json'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

type Messages = Record<string, string>

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

interface LocaleWrapperProps {
  children: React.ReactNode
}

export function LocaleWrapper({ children }: LocaleWrapperProps) {
  const [locale, setLocale] = React.useState('en')
  const [messages, setMessages] = React.useState<Messages>(
    enMessages as Messages
  )

  React.useEffect(() => {
    const savedLocale = getCookie('wren-locale') ?? 'en'
    if (savedLocale === 'en') {
      setLocale('en')
      setMessages(enMessages as Messages)
      return
    }

    // Fetch from TenantLocale cache
    // Use tenantSlug cookie (set by profile page on save) to identify tenant server-side
    const tenantSlug = getCookie('wren-tenant-slug') ?? ''
    setLocale(savedLocale)
    fetch(`${API_BASE}/api/v1/tenant/locale/${savedLocale}?tenantSlug=${encodeURIComponent(tenantSlug)}`, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => {
        if (!r.ok) return null
        return r.json() as Promise<{ data: Messages }>
      })
      .then((j) => {
        if (j?.data) {
          setMessages(j.data)
        }
      })
      .catch(() => {
        // Graceful fallback to English
      })
  }, [])

  return (
    <TranslationsProvider locale={locale} messages={messages}>
      {children}
    </TranslationsProvider>
  )
}
