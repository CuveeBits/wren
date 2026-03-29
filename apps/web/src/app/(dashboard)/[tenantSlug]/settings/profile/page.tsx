'use client'

/**
 * Profile settings page — /[tenantSlug]/settings/profile
 *
 * Sprint 4b (F-06): locale selector.
 * On locale change:
 *   1. Check cache — GET /api/v1/tenant/locale/:locale
 *   2. Generate if miss — POST /api/v1/tenant/locale/generate
 *   3. Set 'wren-locale' cookie
 *   4. Reload page to apply new translations
 *
 * Sprint 4 removal: translationEnabled toggle and defaultLanguage (tenant-level) removed.
 * Locale is now per-user, not per-tenant.
 */
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/translations-context'
import { useAuth } from '@clerk/nextjs'
import { Globe, Check } from 'lucide-react'
import { Button, cn } from '@wren/ui'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n-chat'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

function getCurrentLocale(): string {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|; )wren-locale=([^;]*)/)
  return match?.[1] ? decodeURIComponent(match[1]) : 'en'
}

function setLocaleCookie(locale: string) {
  const maxAge = 365 * 24 * 60 * 60 // 1 year
  document.cookie = `wren-locale=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function setTenantSlugCookie(tenantId: string) {
  const maxAge = 365 * 24 * 60 * 60 // 1 year
  document.cookie = `wren-tenant-slug=${encodeURIComponent(tenantId)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export default function ProfileSettingsPage() {
  const params = useParams<{ tenantSlug: string }>()
  const { tenantSlug } = params
  const router = useRouter()
  const t = useTranslations()
  const { getToken } = useAuth()

  const [currentLocale, setCurrentLocale] = React.useState('en')
  const [selectedLocale, setSelectedLocale] = React.useState('en')
  const [isApplying, setIsApplying] = React.useState(false)
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  React.useEffect(() => {
    const locale = getCurrentLocale()
    setCurrentLocale(locale)
    setSelectedLocale(locale)
  }, [])

  async function handleSave() {
    if (selectedLocale === currentLocale) return
    setIsApplying(true)
    setStatus('saving')

    try {
      const token = await getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Step 1: Check if translations are cached
      if (selectedLocale !== 'en') {
        const checkRes = await fetch(
          `${API_BASE}/api/v1/tenant/locale/${selectedLocale}`,
          { headers }
        )

        if (!checkRes.ok) {
          // Step 2: Generate translations (cache miss)
          const genRes = await fetch(
            `${API_BASE}/api/v1/tenant/locale/generate`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ locale: selectedLocale }),
            }
          )

          if (!genRes.ok) {
            throw new Error('Translation generation failed')
          }
        }
      }

      // Step 3: Set cookies (locale + tenantId for LocaleWrapper)
      setLocaleCookie(selectedLocale)
      setTenantSlugCookie(tenantSlug) // store slug; API resolves to tenantId server-side
      setCurrentLocale(selectedLocale)
      setStatus('saved')

      // Step 4: Reload to apply translations
      setTimeout(() => {
        router.refresh()
        window.location.reload()
      }, 800)
    } catch (err) {
      console.error('Failed to apply locale', err)
      setStatus('error')
      setIsApplying(false)
    }
  }

  const buttonLabel = () => {
    switch (status) {
      case 'saving': return t('settings.profile.saving')
      case 'saved': return t('settings.profile.saved')
      default: return t('settings.profile.save')
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('settings.profile.title')}
        </h1>
      </div>

      {/* Language Selector */}
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{t('settings.profile.language')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('settings.profile.languageHint')}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLocale(lang.code)}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
                selectedLocale === lang.code
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span>{lang.nativeName}</span>
              {selectedLocale === lang.code && (
                <Check className="h-4 w-4 ml-2 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={isApplying || selectedLocale === currentLocale || status === 'saved'}
          >
            {buttonLabel()}
          </Button>
          {status === 'error' && (
            <span className="text-sm text-destructive">{t('common.error')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
