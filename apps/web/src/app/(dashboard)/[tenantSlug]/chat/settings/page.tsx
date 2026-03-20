'use client'

/**
 * C-10 (sprint brief) / C-12: ChatSettingsPage — /[tenantSlug]/chat/settings
 *
 * Tenant admin config:
 * - System prompt textarea
 * - Welcome message
 * - Model selector (future — placeholder for now)
 * - Logo URL
 * - Brand/accent colour pickers (hex input + swatch)
 * - Launcher label
 * - Widget title
 * - Allowed origins list
 *
 * Calls GET/PATCH /api/v1/chat/settings (S-07).
 * Validation: systemPrompt ≤ 8000 chars, hex colors, valid URLs.
 * Live colour preview.
 */
import * as React from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Button, Input, Skeleton, cn } from '@wren/ui'
import { getChatSettings, updateChatSettings, type TenantChatSettings } from '@/components/chat/api'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n-chat'

// ─── Validation ────────────────────────────────────────────────────────────

function isValidHex(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

function isValidUrl(v: string): boolean {
  if (!v) return true
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

function isValidOrigin(v: string): boolean {
  if (!v) return false
  try {
    const u = new URL(v)
    return u.origin === v
  } catch {
    return false
  }
}

// ─── Colour picker ─────────────────────────────────────────────────────────

function ColourInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        {/* Swatch */}
        <div
          className="h-8 w-8 rounded-md border border-border shrink-0"
          style={{ backgroundColor: isValidHex(value) ? value : undefined }}
          aria-hidden="true"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={cn('w-28 font-mono text-sm', error && 'border-destructive')}
          maxLength={7}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Origins list ──────────────────────────────────────────────────────────

function OriginsEditor({
  origins,
  onChange,
}: {
  origins: string[]
  onChange: (o: string[]) => void
}) {
  const [newOrigin, setNewOrigin] = React.useState('')
  const [originError, setOriginError] = React.useState('')

  function add() {
    const trimmed = newOrigin.trim()
    if (!isValidOrigin(trimmed)) {
      setOriginError('Must be a valid origin, e.g. https://example.com')
      return
    }
    if (origins.includes(trimmed)) {
      setOriginError('Already added.')
      return
    }
    onChange([...origins, trimmed])
    setNewOrigin('')
    setOriginError('')
  }

  function remove(o: string) {
    onChange(origins.filter((x) => x !== o))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={newOrigin}
          onChange={(e) => {
            setNewOrigin(e.target.value)
            setOriginError('')
          }}
          placeholder="https://example.com"
          className={cn('flex-1 text-sm', originError && 'border-destructive')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
      {originError && <p className="text-xs text-destructive">{originError}</p>}
      {origins.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {origins.map((o) => (
            <div
              key={o}
              className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5"
            >
              <span className="text-sm font-mono truncate">{o}</span>
              <button
                type="button"
                onClick={() => remove(o)}
                className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${o}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ChatSettingsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()

  const [settings, setSettings] = React.useState<TenantChatSettings | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Form state
  const [systemPrompt, setSystemPrompt] = React.useState('')
  const [welcomeMessage, setWelcomeMessage] = React.useState('')
  const [launcherLabel, setLauncherLabel] = React.useState('Chat with us')
  const [widgetTitle, setWidgetTitle] = React.useState('Wren Assistant')
  const [logoUrl, setLogoUrl] = React.useState('')
  const [brandColor, setBrandColor] = React.useState('#0F172A')
  const [accentColor, setAccentColor] = React.useState('#22C55E')
  const [allowedOrigins, setAllowedOrigins] = React.useState<string[]>([])
  // Sprint 4: translation state
  const [translationEnabled, setTranslationEnabled] = React.useState(false)
  const [defaultLanguage, setDefaultLanguage] = React.useState('en')
  const [supportedLanguages, setSupportedLanguages] = React.useState<string[]>(['en', 'de', 'fr', 'cs', 'pl'])

  // Validation errors
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    setIsLoading(true)
    getChatSettings()
      .then((s) => {
        if (s) {
          setSettings(s)
          setSystemPrompt(s.systemPrompt ?? '')
          setWelcomeMessage(s.welcomeMessage ?? '')
          setLauncherLabel(s.launcherLabel ?? 'Chat with us')
          setWidgetTitle(s.widgetTitle ?? 'Wren Assistant')
          setLogoUrl(s.logoUrl ?? '')
          setBrandColor(s.brandColor ?? '#0F172A')
          setAccentColor(s.accentColor ?? '#22C55E')
          setAllowedOrigins(s.allowedOrigins ?? [])
          // Sprint 4: translation
          setTranslationEnabled(s.translationEnabled ?? false)
          setDefaultLanguage(s.defaultLanguage ?? 'en')
          setSupportedLanguages(s.supportedLanguages?.length ? s.supportedLanguages : ['en', 'de', 'fr', 'cs', 'pl'])
        }
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (systemPrompt.length > 8000) {
      errs.systemPrompt = `System prompt is ${systemPrompt.length} chars — max 8000.`
    }
    if (brandColor && !isValidHex(brandColor)) {
      errs.brandColor = 'Must be a 6-digit hex colour, e.g. #0F172A'
    }
    if (accentColor && !isValidHex(accentColor)) {
      errs.accentColor = 'Must be a 6-digit hex colour, e.g. #22C55E'
    }
    if (logoUrl && !isValidUrl(logoUrl)) {
      errs.logoUrl = 'Must be a valid URL'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setIsSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await updateChatSettings({
        systemPrompt: systemPrompt || null,
        welcomeMessage: welcomeMessage || null,
        launcherLabel,
        widgetTitle,
        logoUrl: logoUrl || null,
        brandColor,
        accentColor,
        allowedOrigins,
        // Sprint 4: translation
        translationEnabled,
        defaultLanguage,
        supportedLanguages,
      })
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
        {Array.from({ length: 5 }).map((_, i) => (
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
      {/* Back link */}
      <Link
        href={`/${tenantSlug}/chat`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Chat
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Chat Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure the AI assistant&apos;s behaviour and WebChat widget appearance.
      </p>

      <div className="flex flex-col gap-8">
        {/* ── Assistant Behaviour ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold border-b border-border pb-2">
            Assistant Behaviour
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="system-prompt" className="text-sm font-medium">
              System Prompt
            </label>
            <p className="text-xs text-muted-foreground">
              Instructions for the AI assistant. Applied to all new conversations. Max 8000 characters.
            </p>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="You are a helpful AI assistant for Acme Corp. Be concise and professional."
              className={cn(
                'w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono leading-relaxed resize-y',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'placeholder:text-muted-foreground',
                errors.systemPrompt && 'border-destructive'
              )}
            />
            <div className="flex items-center justify-between">
              {errors.systemPrompt ? (
                <p className="text-xs text-destructive">{errors.systemPrompt}</p>
              ) : (
                <span />
              )}
              <span className={cn('text-xs text-muted-foreground', systemPrompt.length > 7500 && 'text-amber-500', systemPrompt.length > 8000 && 'text-destructive')}>
                {systemPrompt.length} / 8000
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="welcome-message" className="text-sm font-medium">
              Welcome Message
            </label>
            <p className="text-xs text-muted-foreground">
              Shown in the empty state when a user starts a new conversation.
            </p>
            <Input
              id="welcome-message"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hello! How can I help you today?"
              className="text-sm"
            />
          </div>
        </section>

        {/* ── Widget Branding ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold border-b border-border pb-2">
            Widget Branding
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="widget-title" className="text-sm font-medium">
                Widget Title
              </label>
              <Input
                id="widget-title"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="Wren Assistant"
                className="text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="launcher-label" className="text-sm font-medium">
                Launcher Button Label
              </label>
              <Input
                id="launcher-label"
                value={launcherLabel}
                onChange={(e) => setLauncherLabel(e.target.value)}
                placeholder="Chat with us"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="logo-url" className="text-sm font-medium">
              Logo URL
            </label>
            <Input
              id="logo-url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className={cn('text-sm', errors.logoUrl && 'border-destructive')}
            />
            {errors.logoUrl && (
              <p className="text-xs text-destructive">{errors.logoUrl}</p>
            )}
          </div>

          <div className="flex gap-8 flex-wrap">
            <ColourInput
              label="Brand Colour"
              value={brandColor}
              onChange={setBrandColor}
              error={errors.brandColor}
            />
            <ColourInput
              label="Accent Colour"
              value={accentColor}
              onChange={setAccentColor}
              error={errors.accentColor}
            />
          </div>

          {/* Live colour preview */}
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-md"
                style={{ backgroundColor: isValidHex(brandColor) ? brandColor : '#0F172A' }}
              >
                <span>💬</span>
                <span>{launcherLabel || 'Chat with us'}</span>
              </div>
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow"
                style={{ backgroundColor: isValidHex(accentColor) ? accentColor : '#22C55E' }}
              >
                ↑
              </div>
            </div>
          </div>
        </section>

        {/* ── Allowed Origins ── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold border-b border-border pb-2">
              Allowed Origins
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              Domains permitted to embed the WebChat widget. Leave empty to block all.
              Add your website origin, e.g. <code className="font-mono">https://example.com</code>.
            </p>
          </div>
          <OriginsEditor origins={allowedOrigins} onChange={setAllowedOrigins} />
        </section>

        {/* ── Auto-Translation (Sprint 4) ── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold border-b border-border pb-2">
              Auto-Translation
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              When enabled, user messages are automatically translated to English for the AI,
              and responses are translated back to the user&apos;s language via local Ollama.
              No data leaves your infrastructure.
            </p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Enable auto-translation</p>
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

          {translationEnabled && (
            <>
              {/* Default language */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="default-language" className="text-sm font-medium">
                  Default Language
                </label>
                <p className="text-xs text-muted-foreground">
                  The language to pre-select in the chat composer.
                </p>
                <select
                  id="default-language"
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Supported languages checkboxes */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Supported Languages</label>
                <p className="text-xs text-muted-foreground">
                  Languages your users can select in the chat interface.
                </p>
                <div className="flex flex-wrap gap-3">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <label key={lang.code} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={supportedLanguages.includes(lang.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSupportedLanguages((prev) => [...prev, lang.code])
                          } else {
                            setSupportedLanguages((prev) => prev.filter((c) => c !== lang.code))
                          }
                        }}
                        className="rounded border-border"
                      />
                      {lang.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
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
