'use client'

/**
 * Translation settings page — /[tenantSlug]/settings/translation
 *
 * Sprint 4 UX fix: moved from Chat Settings to a dedicated top-level page.
 * - Auto-translate toggle (translationEnabled)
 * - Default language dropdown (defaultLanguage)
 * - Save → PATCH /api/v1/chat/settings
 */
import * as React from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check } from 'lucide-react'
import Link from 'next/link'
import { Button, Skeleton, cn } from '@wren/ui'
import { getChatSettings, updateChatSettings } from '@/components/chat/api'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n-chat'

const API_BASE = process.env['NEXT_PUBLIC_API_URL']
if (!API_BASE) throw new Error('NEXT_PUBLIC_API_URL is required')

export default function TranslationSettingsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()

  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  const [translationEnabled, setTranslationEnabled] = React.useState(false)
  const [defaultLanguage, setDefaultLanguage] = React.useState('en')

  React.useEffect(() => {
    setIsLoading(true)
    getChatSettings()
      .then((s) => {
        if (s) {
          setTranslationEnabled(s.translationEnabled ?? false)
          setDefaultLanguage(s.defaultLanguage ?? 'en')
        }
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await updateChatSettings({ translationEnabled, defaultLanguage })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8 text-sm text-destructive">
        {loadError}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href={`/${tenantSlug}/chat`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Chat
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Translation</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure automatic message translation for your AI assistant.
      </p>

      <div className="flex flex-col gap-8">
        {/* ── Auto-translate toggle ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold border-b border-border pb-2">
            Auto-Translation
          </h2>
          <p className="text-sm text-muted-foreground">
            When enabled, messages are translated to English for the AI and responses
            translated back to your selected language via local Ollama. No data leaves
            your infrastructure.
          </p>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Auto-translate</p>
              <p className="text-xs text-muted-foreground">
                Translate between user&apos;s language and English automatically.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={translationEnabled}
              onClick={() => setTranslationEnabled(!translationEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                translationEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                  translationEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </section>

        {/* ── Default language ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold border-b border-border pb-2">
            Default Language
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="default-language" className="text-sm font-medium">
              Language
            </label>
            <p className="text-xs text-muted-foreground">
              The default language for translation. Set to Auto to detect from the user&apos;s message.
            </p>
            <select
              id="default-language"
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="w-56 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="auto">Auto</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Save ── */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            {saved && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Settings saved!
              </p>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> Save settings</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
