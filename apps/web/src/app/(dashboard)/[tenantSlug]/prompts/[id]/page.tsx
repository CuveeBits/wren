'use client'

/**
 * Prompt detail + execute page — /[tenantSlug]/prompts/[id]
 *
 * Left panel: prompt metadata + adaptive form (PromptForm)
 * Right panel: streaming AI result (react-markdown), copy, retry
 *
 * Sprint 1 — Task 1.5
 * Sprint 4c — translated prompt title/description + all UI strings via t()
 */
import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Copy, Check, RefreshCw, Paperclip } from 'lucide-react'
import { Badge, Button, cn } from '@wren/ui'
import { PromptForm } from '@/components/prompt/PromptForm'
import type { JSONSchema } from '@/components/prompt/PromptForm'
import { AttachFromKb } from '@/components/kb/AttachFromKb'
import { CitationPanel } from '@/components/kb/CitationPanel'
import type { CitationItem } from '@/components/kb/CitationPanel'
import { SaveToKbToggle } from '@/components/kb/SaveToKbToggle'
import { KbTagBadge } from '@/components/kb/KbTagBadge'
import { getKbContext, getKbDocument } from '@/components/kb/api'
import { useLocale, useTranslations } from '@/i18n/translations-context'
import type { KbContextChunk, KbDocument } from '@/components/kb/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prompt {
  id: string
  title: string
  description: string | null
  category: string
  department: string
  difficulty: string
  estimatedMinutesSaved: number | null
  formSchema: JSONSchema
  promptTemplate: string
  usageCount: number
}

interface ToastState {
  tone: 'success' | 'error'
  message: string
}

interface ExecuteEvent {
  type: 'chunk' | 'done' | 'error' | 'citations'
  content?: string
  tokenCount?: number
  message?: string
  citations?: CitationItem[]
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const DIFFICULTY_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  beginner: 'secondary',
  intermediate: 'default',
  advanced: 'destructive',
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function PromptDetailPage() {
  const params = useParams<{ tenantSlug: string; id: string }>()
  const locale = useLocale()
  const t = useTranslations()
  const { tenantSlug, id } = params
  const router = useRouter()

  const [prompt, setPrompt] = React.useState<Prompt | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  // Sprint 4c: translated title/description + formSchema for the current locale
  const [translatedTitle, setTranslatedTitle] = React.useState<string | null>(null)
  const [translatedDescription, setTranslatedDescription] = React.useState<string | null | undefined>(undefined)
  const [translatedFormSchema, setTranslatedFormSchema] = React.useState<JSONSchema | null>(null)

  // Result panel state
  const [result, setResult] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [tokenCount, setTokenCount] = React.useState<number | null>(null)
  const [streamError, setStreamError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [citations, setCitations] = React.useState<CitationItem[]>([])
  const [attachedDocumentIds, setAttachedDocumentIds] = React.useState<string[]>([])
  const [attachedDocuments, setAttachedDocuments] = React.useState<KbDocument[]>([])
  const [attachModalOpen, setAttachModalOpen] = React.useState(false)
  const [saveToKb, setSaveToKb] = React.useState(false)
  const [toast, setToast] = React.useState<ToastState | null>(null)

  // Last submitted variables (for retry)
  const [lastVariables, setLastVariables] = React.useState<Record<string, string> | null>(null)

  // Fetch prompt on mount
  React.useEffect(() => {
    setIsLoadingPrompt(true)
    fetch(`${API_BASE}/api/v1/prompts/${id}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((j: { data: Prompt } | null) => {
        if (j) setPrompt(j.data)
      })
      .catch(console.error)
      .finally(() => setIsLoadingPrompt(false))
  }, [id])

  // Sprint 4c: fetch translated title/description + formSchema for non-English locales
  React.useEffect(() => {
    setTranslatedTitle(null)
    setTranslatedDescription(undefined)
    setTranslatedFormSchema(null)

    if (!locale || locale === 'en') return

    const qs = new URLSearchParams({ tenantSlug })
    fetch(`${API_BASE}/api/v1/tenant/prompts/locale/${locale}?${qs}`, { credentials: 'omit' })
      .then((r) => {
        if (r.ok) return r.json()
        return null
      })
      .then((j) => {
        if (j?.data) {
          const tx = (j.data as Record<string, { title: string; description: string | null; formSchemaTranslated: JSONSchema | null }>)[id]
          if (tx) {
            setTranslatedTitle(tx.title)
            setTranslatedDescription(tx.description)
            if (tx.formSchemaTranslated) setTranslatedFormSchema(tx.formSchemaTranslated)
          }
        }
      })
      .catch(console.error)
  }, [locale, tenantSlug, id])

  // Execute prompt — streams SSE
  async function execute(variables: Record<string, string>) {
    setLastVariables(variables)
    setResult('')
    setTokenCount(null)
    setStreamError(null)
    setCitations([])
    setIsStreaming(true)

    try {
      let kbContext: KbContextChunk[] = []
      if (attachedDocumentIds.length > 0) {
        const query =
          Object.values(variables)
          .map((value) => value.trim())
          .filter(Boolean)
          .join(' ')
          .slice(0, 500) || prompt?.title || ''

        kbContext = await getKbContext({
          promptId: id,
          documentIds: attachedDocumentIds,
          query,
        })
      }

      const res = await fetch(`${API_BASE}/api/v1/prompts/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          variables,
          documentIds: attachedDocumentIds,
          kbContext,
          saveToKb,
          locale,  // Sprint 4c (F-06): language-aware LLM responses
        }),
      })

      if (!res.ok || !res.body) {
        setStreamError(`${t('prompt.errorFailed')} (${res.status})`)
        setIsStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw) as ExecuteEvent

            if (event.type === 'chunk' && event.content) {
              setResult((prev) => prev + event.content)
            } else if (event.type === 'citations' && event.citations) {
              setCitations(event.citations)
            } else if (event.type === 'done') {
              setTokenCount(event.tokenCount ?? null)
              setIsStreaming(false)
              if (saveToKb) {
                setToast({
                  tone: 'success',
                  message: 'Execution completed and the output was queued to save in the knowledge base.',
                })
              }
            } else if (event.type === 'error') {
              setStreamError(event.message ?? t('common.error'))
              setIsStreaming(false)
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error')
      setStreamError(message)
      setIsStreaming(false)
      setToast({ tone: 'error', message })
    }
  }

  function handleRetry() {
    if (lastVariables) execute(lastVariables)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  React.useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  React.useEffect(() => {
    if (attachedDocumentIds.length === 0) {
      setAttachedDocuments([])
      return
    }

    Promise.all(attachedDocumentIds.map((documentId) => getKbDocument(documentId)))
      .then((documents) => {
        setAttachedDocuments(documents.filter((document): document is KbDocument => document !== null))
      })
      .catch(console.error)
  }, [attachedDocumentIds])

  // Resolved title/description (translated if available, else original)
  const displayTitle = translatedTitle ?? prompt?.title ?? ''
  const displayDescription = translatedDescription !== undefined ? translatedDescription : prompt?.description

  // ── Loading / not found states
  if (isLoadingPrompt) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (notFound || !prompt) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-20 text-center">
        <p className="text-lg font-medium">{t('prompt.notFound')}</p>
        <Button variant="outline" onClick={() => router.push(`/${tenantSlug}/prompts`)}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Back link ── */}
      <Link
        href={`/${tenantSlug}/prompts`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('prompt.back')}
      </Link>

      {/* ── Two-column layout ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: metadata + form ── */}
        <div className="flex flex-col gap-5">
          {/* Metadata */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {prompt.department.replace(/-/g, ' ')}
              </Badge>
              <Badge variant={DIFFICULTY_VARIANT[prompt.difficulty] ?? 'secondary'} className="capitalize">
                {prompt.difficulty}
              </Badge>
              {prompt.estimatedMinutesSaved && (
                <Badge variant="outline">
                  ⏱ {t('prompts.savesMins').replace('{count}', String(prompt.estimatedMinutesSaved))}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{displayTitle}</h1>
            {displayDescription && (
              <p className="text-sm text-muted-foreground">{displayDescription}</p>
            )}
          </div>

          {/* Form */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('prompt.fillForm')}
            </p>
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttachModalOpen(true)}
                >
                  <Paperclip className="h-4 w-4" />
                  {t('chat.attachKb')}
                </Button>
                {attachedDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() =>
                      setAttachedDocumentIds((current) =>
                        current.filter((documentId) => documentId !== document.id)
                      )
                    }
                  >
                    <KbTagBadge tag={document.title} className="max-w-[180px] truncate" />
                  </button>
                ))}
              </div>
              <SaveToKbToggle checked={saveToKb} onCheckedChange={setSaveToKb} />
            </div>
            <PromptForm
              schema={prompt.formSchema}
              formSchemaTranslated={translatedFormSchema}
              onSubmit={execute}
              isLoading={isStreaming}
            />
          </div>
        </div>

        {/* ── Right: result panel ── */}
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              'flex-1 min-h-[300px] rounded-xl border border-border bg-card p-6',
              'relative overflow-y-auto'
            )}
          >
            {!result && !streamError && !isStreaming && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <div className="rounded-full bg-muted p-4">
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-sm font-medium">{t('prompt.resultEmpty')}</p>
                <p className="text-xs">{t('prompt.resultEmptyHint')}</p>
              </div>
            )}

            {streamError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
                <p className="font-medium mb-1">{t('common.error')}</p>
                <p>{streamError}</p>
              </div>
            )}

            {(result || isStreaming) && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground ml-0.5 translate-y-0.5" />
                )}
              </div>
            )}
          </div>

          <CitationPanel citations={citations} />

          {/* Footer actions */}
          {(result && !isStreaming) && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {tokenCount !== null && (
                <p className="text-xs text-muted-foreground">
                  {tokenCount.toLocaleString()} {t('prompt.tokens')}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t('prompt.retry')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <><Check className="mr-1.5 h-3.5 w-3.5" />{t('prompt.copied')}</>
                  ) : (
                    <><Copy className="mr-1.5 h-3.5 w-3.5" />{t('prompt.copy')}</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {streamError && lastVariables && (
            <Button variant="outline" size="sm" onClick={handleRetry} className="w-fit">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t('common.retry')}
            </Button>
          )}
        </div>
      </div>

      <AttachFromKb
        open={attachModalOpen}
        selectedDocumentIds={attachedDocumentIds}
        onClose={() => setAttachModalOpen(false)}
        onConfirm={setAttachedDocumentIds}
      />

      {toast && (
        <div
          className={cn(
            'fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg',
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/80 dark:text-emerald-100'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
