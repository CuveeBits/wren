/**
 * Dashboard layout — wraps all authenticated tenant-scoped pages.
 *
 * Sprint 4b fix: locale resolution is now server-side.
 * Reads wren-locale + wren-tenant-slug cookies on the server,
 * fetches pre-generated translation JSON, and passes messages directly
 * to TranslationsProvider — no useEffect, no flash, no race condition.
 */
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/shell'
import { TranslationsProvider } from '@/i18n/translations-context'
import enMessages from '@/i18n/en.json'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

type Messages = Record<string, string>

async function fetchMessages(locale: string, tenantSlug: string): Promise<Messages> {
  if (locale === 'en' || !locale) return enMessages as Messages
  try {
    const url = `${API_BASE}/api/v1/tenant/locale/${locale}?tenantSlug=${encodeURIComponent(tenantSlug)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return enMessages as Messages
    const j = (await res.json()) as { data?: Messages }
    if (j?.data && typeof j.data === 'object') return { ...(enMessages as Messages), ...(j.data as Messages) }
  } catch {
    // fall through to English
  }
  return enMessages as Messages
}

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const { tenantSlug } = await params

  const cookieStore = await cookies()
  const locale = cookieStore.get('wren-locale')?.value ?? 'en'
  const tenantSlugFromCookie = cookieStore.get('wren-tenant-slug')?.value ?? tenantSlug

  const messages = await fetchMessages(locale, tenantSlugFromCookie)

  return (
    <TranslationsProvider locale={locale} messages={messages}>
      <DashboardShell tenantSlug={tenantSlug}>
        {children}
      </DashboardShell>
    </TranslationsProvider>
  )
}
