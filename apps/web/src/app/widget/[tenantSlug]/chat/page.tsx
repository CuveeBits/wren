'use client'

/**
 * C-14 (sprint brief): WebChat widget shell — /widget/[tenantSlug]/chat
 *
 * Iframe-rendered minimal chat page.
 * Fetches /widget/:tenantSlug/config on mount (S-08) — built by Spark.
 * Applies CSS custom properties (--wren-brand, --wren-accent) to :root.
 * Full chat UI in minimal chrome (no nav rail, no dashboard shell).
 *
 * C-15: Widget launcher toggle is the WidgetLauncher component.
 * When embedded as iframe, the launcher is controlled by the parent window
 * (bootstrap.js). This page renders inline chat UI with its own header.
 *
 * NOTE: Route /widget/:tenantSlug/session is called by Spark (S-08).
 * We call it here to obtain a session token + conversationId.
 */
import * as React from 'react'
import { useParams } from 'next/navigation'
import { MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@wren/ui'
import { MessageThread } from '@/components/chat/MessageThread'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { CitationDrawer } from '@/components/chat/CitationDrawer'
import { ChatErrorBoundary } from '@/components/chat/ChatErrorBoundary'
import {
  getWidgetConfig,
  createWidgetSession,
  sendMessage,
  type WebChatConfig,
  type Message,
  type Citation,
} from '@/components/chat/api'

// ─── Widget-specific sendMessage wrapper (no Clerk creds, uses session token) ──

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function widgetSendMessage(
  tenantSlug: string,
  conversationId: string,
  sessionToken: string,
  options: Parameters<typeof sendMessage>[1]
) {
  const { content, onChunk, onCitations, onDone, onError, signal } = options
  try {
    const res = await fetch(
      `${API_BASE}/widget/${tenantSlug}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ content }),
        signal,
      }
    )
    if (!res.ok) {
      onError(`Failed to send: ${res.status}`)
      return
    }
    const reader = res.body?.getReader()
    if (!reader) {
      onError('No stream')
      return
    }
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue
        try {
          const event = JSON.parse(raw) as { type: string; content?: string; citations?: Citation[]; messageId?: string; tokenInput?: number; tokenOutput?: number; message?: string }
          if (event.type === 'chunk' && event.content) onChunk(event.content)
          else if (event.type === 'citations' && event.citations) onCitations(event.citations)
          else if (event.type === 'done') onDone({ messageId: event.messageId ?? '', tokenInput: event.tokenInput ?? 0, tokenOutput: event.tokenOutput ?? 0 })
          else if (event.type === 'error') onError(event.message ?? 'Error')
        } catch {
          // skip
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return
    onError(err instanceof Error ? err.message : 'Network error')
  }
}

// ─── Main widget page ──────────────────────────────────────────────────────

export default function WidgetChatPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()

  const [config, setConfig] = React.useState<WebChatConfig | null>(null)
  const [sessionToken, setSessionToken] = React.useState<string | null>(null)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isInitialising, setIsInitialising] = React.useState(true)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const [initError, setInitError] = React.useState<string | null>(null)
  const [citationState, setCitationState] = React.useState<{ citations: Citation[]; activeIndex: number } | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)

  // ── Initialise widget: load config + create session ───────────────────
  React.useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [cfg, session] = await Promise.all([
          getWidgetConfig(tenantSlug),
          createWidgetSession(tenantSlug),
        ])
        if (cancelled) return
        if (!cfg) {
          setInitError('Widget configuration not available.')
          return
        }
        if (!session) {
          setInitError('Could not create session.')
          return
        }
        setConfig(cfg)
        setSessionToken(session.token)
        setConversationId(session.conversationId)

        // Apply CSS custom properties for branding
        document.documentElement.style.setProperty('--wren-brand', cfg.brandColor)
        document.documentElement.style.setProperty('--wren-accent', cfg.accentColor)
      } catch (err) {
        if (!cancelled)
          setInitError(err instanceof Error ? err.message : 'Failed to initialise widget.')
      } finally {
        if (!cancelled) setIsInitialising(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [tenantSlug])

  React.useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function handleSend(content: string) {
    if (!sessionToken || !conversationId || isStreaming) return

    const tempUserMsg: Message = {
      id: `tmp-user-${Date.now()}`,
      conversationId,
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

    const tempAssistantId = `tmp-assistant-${Date.now()}`
    const tempAssistantMsg: Message = {
      id: tempAssistantId,
      conversationId,
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

    const abort = new AbortController()
    abortRef.current = abort

    await widgetSendMessage(tenantSlug, conversationId, sessionToken, {
      content,
      signal: abort.signal,
      onChunk: (chunk) => {
        setIsTyping(false)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) return [...prev, { ...tempAssistantMsg, content: chunk }]
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
      onDone: ({ messageId }) => {
        setIsStreaming(false)
        setIsTyping(false)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) return prev
          const existing = prev[idx]
          if (!existing) return prev
          const updated = [...prev]
          updated[idx] = { ...existing, id: messageId || tempAssistantId, status: 'complete' }
          return updated
        })
      },
      onError: (msg) => {
        setIsStreaming(false)
        setIsTyping(false)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempAssistantId)
          if (idx === -1) return prev
          const existing = prev[idx]
          if (!existing) return prev
          const updated = [...prev]
          updated[idx] = { ...existing, status: 'error', errorMessage: msg }
          return updated
        })
      },
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (isInitialising) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">{initError}</p>
      </div>
    )
  }

  const brandColor = config?.brandColor ?? '#0F172A'
  const widgetTitle = config?.widgetTitle ?? 'Wren Assistant'
  const welcomeMessage = config?.welcomeMessage

  return (
    <ChatErrorBoundary>
      <div className="flex h-screen flex-col bg-background overflow-hidden">
        {/* Widget header */}
        <header
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ backgroundColor: brandColor }}
        >
          {config?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="" className="h-7 w-7 rounded object-contain" aria-hidden="true" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold">
              W
            </div>
          )}
          <span className="font-semibold text-white flex-1">{widgetTitle}</span>
        </header>

        {/* Messages or empty state */}
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4" style={{ backgroundColor: `${brandColor}15` }}>
              <MessageSquare className="h-6 w-6" style={{ color: brandColor }} />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {welcomeMessage ?? 'Hello! How can I help you today?'}
            </p>
          </div>
        ) : (
          <MessageThread
            messages={messages}
            isTyping={isTyping}
            onCitationClick={(citations, index) => setCitationState({ citations, activeIndex: index })}
            className="flex-1 min-h-0"
          />
        )}

        {/* Composer */}
        <ChatComposer
          onSend={handleSend}
          isStreaming={isStreaming}
          attachedDocs={[]}
          onOpenPicker={() => {}}
          placeholder="Type a message…"
        />

        {/* Citation drawer */}
        {citationState && (
          <CitationDrawer
            citations={citationState.citations}
            activeIndex={citationState.activeIndex}
            onClose={() => setCitationState(null)}
          />
        )}
      </div>
    </ChatErrorBoundary>
  )
}
