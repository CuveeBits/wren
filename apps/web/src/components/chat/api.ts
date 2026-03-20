'use client'

/**
 * Chat API client — all calls to /api/v1/chat/* and /widget/* routes.
 *
 * NOTE: API routes are built by Spark in parallel (S-01→S-09).
 * Paths are wired to the correct endpoints per sprint-3-brief.
 * If routes aren't live yet, the functions will receive 404/network errors
 * which surface as null/throw — callers handle gracefully.
 */

export interface Conversation {
  id: string
  tenantId: string
  userId: string
  channel: 'app' | 'webchat'
  title: string | null
  status: 'active' | 'archived'
  systemPromptSnapshot: string | null
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
  attachments?: ConversationDocument[]
}

export interface Message {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  status: 'streaming' | 'complete' | 'error'
  model: string | null
  tokenInput: number | null
  tokenOutput: number | null
  errorMessage: string | null
  citations: Citation[] | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface Citation {
  documentId: string
  chunkId: string
  label: string
  documentTitle: string
  pageNumber?: number | null
  excerpt: string
}

export interface ConversationDocument {
  id: string
  conversationId: string
  documentId: string
  createdAt: string
  document?: {
    id: string
    title: string
    fileName: string
    mimeType: string
    sizeBytes: number
  }
}

export interface TenantChatSettings {
  id: string
  tenantId: string
  systemPrompt: string | null
  welcomeMessage: string | null
  launcherLabel: string
  logoUrl: string | null
  brandColor: string
  accentColor: string
  widgetTitle: string
  allowedOrigins: string[]
  createdAt: string
  updatedAt: string
  // Sprint 4: translation settings
  translationEnabled: boolean
  supportedLanguages: string[]
  defaultLanguage: string
}

export interface SSEChunk {
  type: 'chunk' | 'citations' | 'done' | 'error' | 'ping'
  content?: string
  citations?: Citation[]
  messageId?: string
  tokenInput?: number
  tokenOutput?: number
  message?: string
  code?: string
}

// ─── Config ────────────────────────────────────────────────────────────────

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
  })
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Conversations ─────────────────────────────────────────────────────────

export interface ListConversationsOptions {
  q?: string
  channel?: 'app' | 'webchat'
  cursor?: string
  limit?: number
}

export async function listConversations(
  options: ListConversationsOptions = {}
): Promise<Conversation[]> {
  const qs = new URLSearchParams()
  if (options.q) qs.set('q', options.q)
  if (options.channel) qs.set('channel', options.channel)
  if (options.cursor) qs.set('cursor', options.cursor)
  if (options.limit) qs.set('limit', String(options.limit))
  const json = await fetchJson<{ data: Conversation[] }>(
    `/api/v1/chat/conversations?${qs}`
  )
  return json?.data ?? []
}

export async function createConversation(opts?: {
  documentIds?: string[]
  channel?: 'app' | 'webchat'
}): Promise<Conversation | null> {
  const json = await fetchJson<{ data: Conversation }>(
    '/api/v1/chat/conversations',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts ?? {}),
    }
  )
  return json?.data ?? null
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const json = await fetchJson<{ data: Conversation }>(
    `/api/v1/chat/conversations/${id}`
  )
  return json?.data ?? null
}

export async function updateConversation(
  id: string,
  patch: { title?: string; status?: 'active' | 'archived' }
): Promise<Conversation | null> {
  const json = await fetchJson<{ data: Conversation }>(
    `/api/v1/chat/conversations/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }
  )
  return json?.data ?? null
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/chat/conversations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

// ─── Messages ──────────────────────────────────────────────────────────────

export async function listMessages(
  conversationId: string,
  cursor?: string
): Promise<Message[]> {
  const qs = new URLSearchParams()
  if (cursor) qs.set('cursor', cursor)
  const json = await fetchJson<{ data: Message[] }>(
    `/api/v1/chat/conversations/${conversationId}/messages?${qs}`
  )
  return json?.data ?? []
}

export interface SendMessageOptions {
  content: string
  /** Sprint 4: ISO 639-1 language code or 'auto' */
  language?: string
  onChunk: (chunk: string) => void
  onCitations: (citations: Citation[]) => void
  onDone: (meta: { messageId: string; tokenInput: number; tokenOutput: number }) => void
  onError: (msg: string) => void
  signal?: AbortSignal
}

/**
 * Send a user message and stream the assistant response via SSE (fetch-based).
 * The POST endpoint (S-03) returns a streaming SSE response.
 * NOTE: Route is /api/v1/chat/conversations/:id/messages — built by Spark.
 */
export async function sendMessage(
  conversationId: string,
  options: SendMessageOptions
): Promise<void> {
  const { content, language, onChunk, onCitations, onDone, onError, signal } = options
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, ...(language ? { language } : {}) }),
        signal,
      }
    )
    if (!res.ok) {
      onError(`Failed to send message: ${res.status}`)
      return
    }
    const reader = res.body?.getReader()
    if (!reader) {
      onError('No stream available')
      return
    }
    const decoder = new TextDecoder()
    let buffer = ''
    console.log('[SSE] Stream started, reading...')
    while (true) {
      const { done, value } = await reader.read()
      console.log('[SSE] read:', done, value?.length)
      if (done) { console.log('[SSE] Stream done'); break }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue
        try {
          const event = JSON.parse(raw) as SSEChunk
          if (event.type === 'ping') {// keepalive, ignore
          } else if (event.type === 'chunk' && event.content) {
            onChunk(event.content)
          } else if (event.type === 'citations' && event.citations) {
            onCitations(event.citations)
          } else if (event.type === 'done') {
            onDone({
              messageId: event.messageId ?? '',
              tokenInput: event.tokenInput ?? 0,
              tokenOutput: event.tokenOutput ?? 0,
            })
          } else if (event.type === 'error') {
            onError(event.message ?? 'Stream error')
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return
    onError(err instanceof Error ? err.message : 'Network error')
  }
}

export async function retryLastMessage(conversationId: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/chat/conversations/${conversationId}/retry`, {
    method: 'POST',
    credentials: 'include',
  })
}

// ─── Attachments ───────────────────────────────────────────────────────────

export async function attachDocuments(
  conversationId: string,
  documentIds: string[]
): Promise<void> {
  await fetchJson(`/api/v1/chat/conversations/${conversationId}/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentIds }),
  })
}

export async function detachDocument(
  conversationId: string,
  documentId: string
): Promise<void> {
  await fetch(
    `${API_BASE}/api/v1/chat/conversations/${conversationId}/attachments/${documentId}`,
    { method: 'DELETE', credentials: 'include' }
  )
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function getChatSettings(): Promise<TenantChatSettings | null> {
  const json = await fetchJson<{ data: TenantChatSettings }>('/api/v1/chat/settings')
  return json?.data ?? null
}

export async function updateChatSettings(
  patch: Partial<
    Pick<
      TenantChatSettings,
      | 'systemPrompt'
      | 'welcomeMessage'
      | 'launcherLabel'
      | 'logoUrl'
      | 'brandColor'
      | 'accentColor'
      | 'widgetTitle'
      | 'allowedOrigins'
      // Sprint 4: translation
      | 'translationEnabled'
      | 'defaultLanguage'
      | 'supportedLanguages'
    >
  >
): Promise<TenantChatSettings | null> {
  const json = await fetchJson<{ data: TenantChatSettings }>('/api/v1/chat/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return json?.data ?? null
}

// ─── Widget public API ─────────────────────────────────────────────────────

export interface WebChatConfig {
  widgetTitle: string
  launcherLabel: string
  welcomeMessage: string | null
  logoUrl: string | null
  brandColor: string
  accentColor: string
}

export async function getWidgetConfig(tenantSlug: string): Promise<WebChatConfig | null> {
  // NOTE: Route built by Spark (S-08). Public, no Clerk auth.
  try {
    const res = await fetch(`${API_BASE}/widget/${tenantSlug}/config`)
    if (!res.ok) return null
    const json = (await res.json()) as { data: WebChatConfig }
    return json.data ?? null
  } catch {
    return null
  }
}

export interface WidgetSessionToken {
  token: string
  conversationId: string
}

export async function createWidgetSession(
  tenantSlug: string
): Promise<WidgetSessionToken | null> {
  // NOTE: Route built by Spark (S-08).
  const sessionKey =
    sessionStorage.getItem('wren_session_key') ??
    (() => {
      const k = crypto.randomUUID()
      sessionStorage.setItem('wren_session_key', k)
      return k
    })()
  try {
    const res = await fetch(`${API_BASE}/widget/${tenantSlug}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: WidgetSessionToken }
    return json.data ?? null
  } catch {
    return null
  }
}
