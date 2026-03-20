'use client'

/**
 * C-02 / C-04 / C-05 / C-06 / C-07 / C-08 / C-09:
 * Individual conversation page — /[tenantSlug]/chat/[id]
 *
 * Wires together:
 * - MessageThread (message history with auto-scroll)
 * - ChatComposer (textarea + send + KB picker)
 * - KBAttachmentPicker (modal)
 * - CitationDrawer (slide-in sources panel)
 * - ConversationTitle (inline editable)
 * - Streaming via sendMessage() SSE
 *
 * API routes (built by Spark):
 * - GET /api/v1/chat/conversations/:id — load conversation
 * - GET /api/v1/chat/conversations/:id/messages — load history
 * - POST /api/v1/chat/conversations/:id/messages — send + stream (SSE)
 * - POST /api/v1/chat/conversations/:id/retry — retry last error
 * - POST /api/v1/chat/conversations/:id/attachments — attach docs
 */
import * as React from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { RefreshCw, Archive } from 'lucide-react'
import { Button, cn } from '@wren/ui'
import { MessageThread } from '@/components/chat/MessageThread'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { KBAttachmentPicker } from '@/components/chat/KBAttachmentPicker'
import { CitationDrawer } from '@/components/chat/CitationDrawer'
import { ConversationTitle } from '@/components/chat/ConversationTitle'
import {
  getConversation,
  listMessages,
  sendMessage,
  retryLastMessage,
  detachDocument,
  updateConversation,
  type Conversation,
  type Message,
  type Citation,
} from '@/components/chat/api'
import type { KbDocument } from '@/components/kb/api'
// Sprint 4: translation
import { getChatSettings } from '@/components/chat/api'
import { LANGUAGE_AUTO } from '@/lib/i18n-chat'

export default function ConversationPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [conversation, setConversation] = React.useState<Conversation | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [attachedDocs, setAttachedDocs] = React.useState<KbDocument[]>([])
  const [isLoadingConv, setIsLoadingConv] = React.useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(true)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const [showKbPicker, setShowKbPicker] = React.useState(false)
  const [citationState, setCitationState] = React.useState<{
    citations: Citation[]
    activeIndex: number
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)

  // Sprint 4: language selection state
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>(LANGUAGE_AUTO)
  const [translationEnabled, setTranslationEnabled] = React.useState(false)

  // ── Load conversation ────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false
    setIsLoadingConv(true)
    getConversation(id)
      .then((conv) => {
        if (!cancelled && conv) {
          setConversation(conv)
          // Populate attached docs from conversation
          const docs = (conv.attachments ?? []).map((att) => att.document).filter(Boolean) as KbDocument[]
          setAttachedDocs(docs)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load conversation.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingConv(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // ── Load messages ────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false
    setIsLoadingMessages(true)
    setMessages([])
    listMessages(id)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load messages.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // ── Handle initialMessage query param (from EmptyState suggested prompts) ──
  React.useEffect(() => {
    const initial = searchParams.get('initialMessage')
    if (initial && !isLoadingMessages && messages.length === 0) {
      // Remove query param, then wait for component to fully mount before sending
      router.replace(`/${tenantSlug}/chat/${id}`)
      const timer = setTimeout(() => { handleSend(initial) }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMessages])

  // ── Cleanup abort controller on unmount ─────────────────────────────────
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // ── Sprint 4: Load translation settings ──────────────────────────────────
  React.useEffect(() => {
    getChatSettings().then((s) => {
      if (!s) return
      const enabled = s.translationEnabled ?? false
      const defaultLang = s.defaultLanguage ?? LANGUAGE_AUTO
      setTranslationEnabled(enabled)
      if (enabled) setSelectedLanguage(defaultLang)
    }).catch(() => {})
  }, [])

  // ── Send message ─────────────────────────────────────────────────────────
  async function handleSend(content: string) {
    if (isStreaming) return
    setError(null)

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `tmp-user-${Date.now()}`,
      conversationId: id,
      role: 'user',
      content,
      status: 'complete',
      model: null,
      tokenInput: null,
      tokenOutput: null,
      errorMessage: null,
      citations: null,
      metadata: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    // Placeholder streaming assistant message
    const tempAssistantId = `tmp-assistant-${Date.now()}`
    const tempAssistantMsg: Message = {
      id: tempAssistantId,
      conversationId: id,
      role: 'assistant',
      content: '',
      status: 'streaming',
      model: null,
      tokenInput: null,
      tokenOutput: null,
      errorMessage: null,
      citations: null,
      metadata: null,
      createdAt: new Date().toISOString(),
    }

    setIsStreaming(true)
    setIsTyping(true)

    let doneReceived = false
    const abort = new AbortController()
    abortRef.current = abort

    await sendMessage(id, {
      content,
      // Sprint 4: pass selected language to backend for translation
      language: translationEnabled ? selectedLanguage : undefined,
      signal: abort.signal,
      onChunk: (chunk) => {
        setIsTyping(false)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) {
            return [...prev, { ...tempAssistantMsg, content: chunk }]
          }
          const existing = prev[idx]
          if (!existing) return prev
          const updated = [...prev]
          updated[idx] = { ...existing, content: existing.content + chunk }
          return updated
        })
      },
      onCitations: (citations) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) return prev
          const existing = prev[idx]
          if (!existing) return prev
          const updated = [...prev]
          updated[idx] = { ...existing, citations }
          return updated
        })
      },
      onDone: ({ messageId, tokenInput, tokenOutput }) => {
        setIsStreaming(false)
        setIsTyping(false)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) return prev
          const existing = prev[idx]
          if (!existing) return prev
          const updated = [...prev]
          updated[idx] = {
            ...existing,
            id: messageId || tempAssistantId,
            status: 'complete',
            tokenInput,
            tokenOutput,
          }
          return updated
        })
        // Reload messages to get real IDs from server
        doneReceived = true
        listMessages(id).then((msgs) => setMessages(msgs)).catch(() => {})
      },
      onError: (msg) => {
        if (doneReceived) return // stream completed successfully, ignore trailing error
        setIsStreaming(false)
        setIsTyping(false)
        setError(msg)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) return prev
          const existing = prev[idx]
          if (!existing) return prev
          const updated = [...prev]
          updated[idx] = {
            ...existing,
            status: 'error',
            errorMessage: msg,
          }
          return updated
        })
      },
    })
  }

  // ── Retry ────────────────────────────────────────────────────────────────
  async function handleRetry() {
    setError(null)
    try {
      await retryLastMessage(id)
      const msgs = await listMessages(id)
      setMessages(msgs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    }
  }

  // ── Detach doc ───────────────────────────────────────────────────────────
  async function handleDetachDoc(docId: string) {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== docId))
    await detachDocument(id, docId).catch(() => {})
  }

  // ── KB picker ─────────────────────────────────────────────────────────────
  function handleAttached(docs: KbDocument[]) {
    setAttachedDocs((prev) => {
      const existing = new Set(prev.map((d) => d.id))
      return [...prev, ...docs.filter((d) => !existing.has(d.id))]
    })
  }

  // ── Citation drawer ───────────────────────────────────────────────────────
  function handleCitationClick(citations: Citation[], index: number) {
    setCitationState({ citations, activeIndex: index })
  }

  const hasError = messages.some((m) => m.status === 'error')
  const isArchived = conversation?.status === 'archived'

  return (
    <div className="flex h-full flex-col min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          {conversation ? (
            <ConversationTitle
              conversationId={id}
              title={conversation.title}
              placeholder={messages.find((m) => m.role === 'user')?.content.slice(0, 40) ?? 'New conversation'}
              onUpdated={(title) => setConversation((c) => c ? { ...c, title } : c)}
            />
          ) : (
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {hasError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="gap-1.5 text-xs"
              disabled={isStreaming}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          {conversation && !isArchived && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => {
                await updateConversation(id, { status: 'archived' })
                router.push(`/${tenantSlug}/chat`)
              }}
              title="Archive conversation"
              aria-label="Archive conversation"
            >
              <Archive className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Archived banner */}
      {isArchived && (
        <div className="bg-muted/50 border-b border-border px-4 py-2 text-xs text-muted-foreground text-center">
          This conversation is archived.
        </div>
      )}

      {/* Stream error banner */}
      {error && !messages.some((m) => m.status === 'error') && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 text-destructive/70 hover:text-destructive"
          >
            ×
          </button>
        </div>
      )}

      {/* Message thread */}
      <MessageThread
        messages={messages}
        isLoading={isLoadingMessages || isLoadingConv}
        isTyping={isTyping}
        onCitationClick={handleCitationClick}
        className="flex-1 min-h-0"
      />

      {/* Composer */}
      {!isArchived && (
        <ChatComposer
          onSend={handleSend}
          isStreaming={isStreaming}
          attachedDocs={attachedDocs}
          onOpenPicker={() => setShowKbPicker(true)}
          onDetachDoc={handleDetachDoc}
          translationEnabled={translationEnabled}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
        />
      )}

      {/* KB Attachment Picker modal */}
      {showKbPicker && (
        <KBAttachmentPicker
          conversationId={id}
          alreadyAttachedIds={attachedDocs.map((d) => d.id)}
          onClose={() => setShowKbPicker(false)}
          onAttached={handleAttached}
        />
      )}

      {/* Citation drawer */}
      {citationState && (
        <CitationDrawer
          citations={citationState.citations}
          activeIndex={citationState.activeIndex}
          onClose={() => setCitationState(null)}
        />
      )}
    </div>
  )
}
