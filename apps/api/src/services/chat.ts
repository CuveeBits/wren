/**
 * Chat orchestration service — Sprint 3 (F-02, F-03, F-04, F-05, F-06).
 *
 * Full implementation replacing the Sprint 3 stub.
 * Wires: createConversation → sendMessage → ChatAgent → LiteLLM → SSE stream
 *
 * Function signatures match what Spark's routes expect (preserved from stub).
 *
 * ADR compliance (non-negotiable):
 * - ALL LLM calls via @wren/llm → LiteLLM proxy (ADR-005)
 * - Custom agent runtime only — no LangChain/CrewAI (ADR-007)
 * - Every DB query scoped by tenantId (ADR-003)
 * - User message persisted BEFORE SSE stream opens
 * - Assistant message created with status:streaming BEFORE first chunk
 * - On stream complete → status:complete with token counts
 * - On stream error → status:error with errorMessage
 * - billing:meter BullMQ job enqueued after every successful assistant turn
 * - title generation BullMQ job after first user message (F-06, async, non-blocking)
 */

import type { ServerResponse } from 'node:http'
import { db } from '@wren/db'
import { createId } from '@paralleldrive/cuid2'
import Redis from 'ioredis'
import { Queue } from 'bullmq'
import { ChatAgent } from '@wren/agents'
import type { ConversationContext } from '@wren/agents'
import { retrieveChunks } from './kb/retrieval'
import { signToken, verifyToken } from '@wren/channels'
import type { SessionTokenPayload } from '@wren/channels'

// ── Re-usable types (preserved from stub contract) ───────────────────────────

export interface ConversationSummary {
  id: string
  tenantId: string
  userId: string
  channel: string
  title: string | null
  status: string
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ConversationDetail extends ConversationSummary {
  systemPromptSnapshot: string | null
  messages: MessageRecord[]
  attachments: AttachmentRecord[]
}

export interface MessageRecord {
  id: string
  conversationId: string
  role: string
  content: string
  status: string
  model: string | null
  tokenInput: number | null
  tokenOutput: number | null
  errorMessage: string | null
  citations: unknown
  metadata: unknown
  createdAt: Date
}

export interface AttachmentRecord {
  id: string
  conversationId: string
  documentId: string
  createdAt: Date
}

export interface TenantChatSettingsRecord {
  id: string
  tenantId: string
  systemPrompt: string | null
  welcomeMessage: string | null
  launcherLabel: string | null
  logoUrl: string | null
  brandColor: string | null
  accentColor: string | null
  widgetTitle: string | null
  allowedOrigins: string[]
  // TODO: Future fields (model, kbDefaults) for forward compatibility
  model?: string | null
  kbDefaults?: unknown
  createdAt: Date
  updatedAt: Date
}

export interface CreateConversationInput {
  tenantId: string
  userId: string
  channel?: string
  documentIds?: string[]
}

export interface ListConversationsInput {
  tenantId: string
  q?: string
  channel?: string
  cursor?: string
  limit?: number
}

export interface SendMessageInput {
  conversationId: string
  tenantId: string
  userId: string
  content: string
}

export interface AttachDocumentInput {
  conversationId: string
  tenantId: string
  documentId: string
}

export interface UpdateChatSettingsInput {
  tenantId: string
  systemPrompt?: string | null
  welcomeMessage?: string | null
  launcherLabel?: string | null
  logoUrl?: string | null
  brandColor?: string | null
  accentColor?: string | null
  widgetTitle?: string | null
  allowedOrigins?: string[]
}

// ── Infrastructure singletons ─────────────────────────────────────────────────
// Redis and queues initialised lazily from env vars.
// In production, the API server passes the shared Redis instance via config.
// For the service layer, we use module-level singletons.

let _redis: Redis | null = null
let _billingQueue: Queue | null = null
let _titleQueue: Queue | null = null

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env['REDIS_URL']
    if (!url) throw new Error('REDIS_URL not set')
    _redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true })
  }
  return _redis
}

function getBillingQueue(): Queue {
  if (!_billingQueue) {
    _billingQueue = new Queue('billing-meter', { connection: getRedis() })
  }
  return _billingQueue
}

function getTitleQueue(): Queue {
  if (!_titleQueue) {
    _titleQueue = new Queue('conversation-title', { connection: getRedis() })
  }
  return _titleQueue
}

function getLiteLLMConfig(): { baseUrl: string; apiKey: string } {
  return {
    baseUrl: process.env['LITELLM_BASE_URL'] ?? 'http://localhost:4000',
    apiKey: process.env['LITELLM_API_KEY'] ?? 'sk-dummy',
  }
}

// ── Widget session secret ─────────────────────────────────────────────────────

function getWidgetSecret(tenantId: string): string {
  // Per-tenant secret: base secret + tenantId hash
  // In production, store per-tenant secret in TenantChatSettings or Vault
  const base = process.env['WIDGET_SECRET'] ?? 'wren-widget-secret-change-me'
  return `${base}:${tenantId}`
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Lists conversations for a tenant, ordered by lastMessageAt desc.
 * Supports FTS search (F-10), channel filter, and cursor pagination.
 */
export async function listConversations(
  input: ListConversationsInput
): Promise<{ data: ConversationSummary[]; nextCursor: string | null }> {
  const limit = input.limit ?? 20

  // Build base where clause (tenantId always scoped — ADR-003)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    tenantId: input.tenantId,
    status: 'active',
  }
  if (input.channel) where.channel = input.channel

  // FTS search — find matching conversation IDs via Postgres full-text search
  if (input.q?.trim()) {
    const sanitised = input.q.trim().replace(/[^\w\s]/g, '')
    const ftsResults = await db.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT c."id"
      FROM "Conversation" c
      LEFT JOIN "Message" m ON m."conversationId" = c."id"
      WHERE c."tenantId" = ${input.tenantId}
        AND c."status" = 'active'
        AND (
          to_tsvector('english', COALESCE(c."title", '')) @@ plainto_tsquery('english', ${sanitised})
          OR to_tsvector('english', COALESCE(m."contentText", '')) @@ plainto_tsquery('english', ${sanitised})
        )
      LIMIT 200
    `
    if (ftsResults.length === 0) return { data: [], nextCursor: null }
    where.id = { in: ftsResults.map((r) => r.id) }
  }

  // Cursor-based pagination (by lastMessageAt)
  if (input.cursor) {
    try {
      where.lastMessageAt = { lt: new Date(input.cursor) }
    } catch {
      // ignore invalid cursor
    }
  }

  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      tenantId: true,
      userId: true,
      channel: true,
      title: true,
      status: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const hasMore = conversations.length > limit
  const page = hasMore ? conversations.slice(0, limit) : conversations
  const nextCursor =
    hasMore ? (page[page.length - 1]?.lastMessageAt?.toISOString() ?? null) : null

  return { data: page as ConversationSummary[], nextCursor }
}

/**
 * Creates a new conversation.
 * F-05: Captures systemPromptSnapshot from TenantChatSettings at creation time.
 * Optionally attaches KB documents (validated against tenant KB).
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationSummary> {
  // F-05: Snapshot systemPrompt at conversation creation
  const settings = await db.tenantChatSettings.findUnique({
    where: { tenantId: input.tenantId },
    select: { systemPrompt: true },
  })

  const conversation = await db.conversation.create({
    data: {
      id: createId(),
      tenantId: input.tenantId,
      userId: input.userId,
      channel: input.channel ?? 'app',
      status: 'active',
      systemPromptSnapshot: settings?.systemPrompt ?? null,
    },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      channel: true,
      title: true,
      status: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Attach documents if provided (validate they belong to tenant KB)
  if (input.documentIds?.length) {
    const tenantKb = await db.knowledgeBase.findUnique({
      where: { tenantId: input.tenantId },
      select: { id: true },
    })
    if (tenantKb) {
      const validDocs = await db.kbDocument.findMany({
        where: {
          id: { in: input.documentIds },
          knowledgeBaseId: tenantKb.id,
          status: 'ready',
        },
        select: { id: true },
      })
      if (validDocs.length > 0) {
        await db.conversationDocument.createMany({
          data: validDocs.map((d) => ({
            id: createId(),
            conversationId: conversation.id,
            documentId: d.id,
          })),
          skipDuplicates: true,
        })
      }
    }
  }

  return conversation as ConversationSummary
}

/**
 * Fetches a conversation with messages and attachments.
 * Validates tenantId ownership.
 */
export async function getConversation(
  id: string,
  tenantId: string
): Promise<ConversationDetail | null> {
  const conversation = await db.conversation.findFirst({
    where: { id, tenantId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      attachments: true,
    },
  })
  return conversation as ConversationDetail | null
}

/**
 * Archives a conversation (soft delete).
 */
export async function archiveConversation(
  id: string,
  tenantId: string
): Promise<ConversationSummary | null> {
  const existing = await db.conversation.findFirst({
    where: { id, tenantId },
    select: { id: true },
  })
  if (!existing) return null

  const updated = await db.conversation.update({
    where: { id },
    data: { status: 'archived', updatedAt: new Date() },
    select: {
      id: true, tenantId: true, userId: true, channel: true,
      title: true, status: true, lastMessageAt: true, createdAt: true, updatedAt: true,
    },
  })
  return updated as ConversationSummary
}

/**
 * Full streaming pipeline (F-02, F-03, F-04, F-06).
 *
 * 1. Validate conversation (active, tenant-scoped)
 * 2. Persist user message
 * 3. Create assistant message as status:streaming
 * 4. F-04: Retrieve top-8 KB chunks from attached documents
 * 5. F-06: Enqueue title generation job after first user message
 * 6. F-03: Run ChatAgent with conversation context → stream to SSE
 * 7. On complete: update message to status:complete, enqueue billing:meter
 * 8. On error: update message to status:error
 */
export async function sendMessageStream(
  input: SendMessageInput,
  res: ServerResponse
): Promise<void> {
  const { conversationId, tenantId, userId, content } = input

  // Validate conversation
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, tenantId, status: 'active' },
    include: { attachments: { select: { documentId: true } } },
  })

  if (!conversation) {
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: 'Conversation not found or not active', code: 'CONV_NOT_FOUND' })}\n\n`
    )
    return
  }

  // 1. Persist user message BEFORE opening stream
  const userMessage = await db.message.create({
    data: {
      id: createId(),
      conversationId,
      role: 'user',
      content,
      contentText: content,
      status: 'complete',
    },
  })

  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: userMessage.createdAt, updatedAt: new Date() },
  })

  // 2. Create assistant message as status:streaming
  const assistantMessage = await db.message.create({
    data: {
      id: createId(),
      conversationId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    },
  })

  // F-06: Enqueue title generation after first user message
  const userMsgCount = await db.message.count({
    where: { conversationId, role: 'user' },
  })
  if (userMsgCount === 1) {
    const litellm = getLiteLLMConfig()
    try {
      await getTitleQueue().add('generate-title', {
        conversationId,
        tenantId,
        firstUserMessage: content.slice(0, 500),
        litellmBaseUrl: litellm.baseUrl,
        litellmApiKey: litellm.apiKey,
      })
    } catch (err) {
      console.error('[chat] Failed to enqueue title job:', err)
      // Non-fatal
    }
  }

  // F-04: Retrieve top-8 KB chunks from attached documents
  const documentIds = conversation.attachments.map((a) => a.documentId)
  let kbChunks: Awaited<ReturnType<typeof retrieveChunks>> = []
  const citations: Array<{
    documentId: string; chunkId: string; label: string
    documentTitle: string; documentFileName: string
    excerpt: string; pageNumber?: number; chunkIndex: number
  }> = []

  if (documentIds.length > 0) {
    try {
      kbChunks = await retrieveChunks(content, documentIds, 8)
      for (const [idx, chunk] of kbChunks.entries()) {
        citations.push({
          documentId: chunk.documentId,
          chunkId: chunk.id,
          label: `[${idx + 1}]`,
          documentTitle: chunk.documentTitle,
          documentFileName: chunk.documentFileName,
          excerpt: chunk.content.slice(0, 300),
          pageNumber: chunk.pageNumber ?? undefined,
          chunkIndex: chunk.chunkIndex,
        })
      }
    } catch (err) {
      console.error('[chat] KB retrieval failed:', err)
    }
  }

  // Emit citations before streaming starts
  if (citations.length > 0) {
    res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`)
  }

  // F-03: Build conversation context for ChatAgent
  const litellm = getLiteLLMConfig()
  const context: ConversationContext = {
    tenantId,
    userId,
    conversationId,
    channel: (conversation.channel ?? 'app') as 'app' | 'webchat',
    systemPromptSnapshot: conversation.systemPromptSnapshot ?? undefined,
    kbChunks,
    citations,
    litellmBaseUrl: litellm.baseUrl,
    litellmApiKey: litellm.apiKey,
  }

  let fullContent = ''
  let tokenInput = 0
  let tokenOutput = 0
  let streamError: string | null = null

  // Stream via ChatAgent
  try {
    const redis = getRedis()
    const agent = new ChatAgent({ redis, context })

    for await (const chunk of agent.stream(content)) {
      if (chunk.type === 'chunk' && chunk.content) {
        fullContent += chunk.content
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'done') {
        tokenInput = chunk.tokenInput ?? 0
        tokenOutput = chunk.tokenOutput ?? 0
      } else if (chunk.type === 'error') {
        streamError = chunk.message ?? 'Unknown agent error'
        break
      }
    }
  } catch (err) {
    streamError = err instanceof Error ? err.message : String(err)
  }

  if (streamError) {
    await db.message.update({
      where: { id: assistantMessage.id },
      data: { status: 'error', errorMessage: streamError, content: fullContent },
    })
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: streamError, code: 'AGENT_ERROR' })}\n\n`
    )
    return
  }

  // Finalise assistant message to complete
  await db.message.update({
    where: { id: assistantMessage.id },
    data: {
      content: fullContent,
      contentText: fullContent,
      status: 'complete',
      tokenInput,
      tokenOutput,
      citations: citations.length > 0 ? JSON.parse(JSON.stringify(citations)) : undefined,
    },
  })

  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), updatedAt: new Date() },
  })

  // Enqueue billing:meter job (Rule 10: token count on every LLM call)
  try {
    await getBillingQueue().add('meter', {
      tenantId,
      conversationId,
      messageId: assistantMessage.id,
      tokenInput,
      tokenOutput,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[chat] Failed to enqueue billing job:', err)
  }

  res.write(
    `data: ${JSON.stringify({
      type: 'done',
      messageId: assistantMessage.id,
      userMessageId: userMessage.id,
      tokenInput,
      tokenOutput,
    })}\n\n`
  )
}

/**
 * Lists paginated messages for a conversation (cursor-based, newest first).
 */
export async function listMessages(
  conversationId: string,
  tenantId: string,
  cursor?: string,
  limit = 50
): Promise<{ data: MessageRecord[]; nextCursor: string | null }> {
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  })
  if (!conv) return { data: [], nextCursor: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { conversationId }
  if (cursor) {
    try {
      where.createdAt = { lt: new Date(cursor) }
    } catch { /* ignore invalid cursor */ }
  }

  const messages = await db.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  })

  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? (page[page.length - 1]?.createdAt.toISOString() ?? null) : null

  return { data: page.reverse() as MessageRecord[], nextCursor }
}

/**
 * Attaches a KB document to a conversation.
 * Validates the document belongs to the tenant's KB.
 */
export async function attachDocument(
  input: AttachDocumentInput
): Promise<AttachmentRecord | null> {
  const [conversation, kb] = await Promise.all([
    db.conversation.findFirst({ where: { id: input.conversationId, tenantId: input.tenantId }, select: { id: true } }),
    db.knowledgeBase.findUnique({ where: { tenantId: input.tenantId }, select: { id: true } }),
  ])
  if (!conversation || !kb) return null

  const document = await db.kbDocument.findFirst({
    where: { id: input.documentId, knowledgeBaseId: kb.id },
    select: { id: true },
  })
  if (!document) return null

  const attachment = await db.conversationDocument.upsert({
    where: {
      conversationId_documentId: {
        conversationId: input.conversationId,
        documentId: input.documentId,
      },
    },
    create: { id: createId(), conversationId: input.conversationId, documentId: input.documentId },
    update: {},
  })
  return attachment as AttachmentRecord
}

/**
 * Detaches a KB document from a conversation.
 */
export async function detachDocument(
  conversationId: string,
  documentId: string,
  tenantId: string
): Promise<boolean> {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  })
  if (!conversation) return false

  const result = await db.conversationDocument.deleteMany({ where: { conversationId, documentId } })
  return result.count > 0
}

/**
 * Gets (or upserts) TenantChatSettings for a tenant.
 */
export async function getChatSettings(tenantId: string): Promise<TenantChatSettingsRecord> {
  const settings = await db.tenantChatSettings.upsert({
    where: { tenantId },
    create: { id: createId(), tenantId, allowedOrigins: [] },
    update: {},
  })
  return settings as unknown as TenantChatSettingsRecord
}

/**
 * Updates TenantChatSettings for a tenant.
 * systemPrompt is validated to ≤8000 chars at API route level.
 */
export async function updateChatSettings(
  input: UpdateChatSettingsInput
): Promise<TenantChatSettingsRecord> {
  const { tenantId, ...data } = input
  const settings = await db.tenantChatSettings.upsert({
    where: { tenantId },
    create: { id: createId(), tenantId, allowedOrigins: [], ...data },
    update: data,
  })
  return settings as unknown as TenantChatSettingsRecord
}

/**
 * Resolves tenantId from tenantSlug.
 */
export async function resolveTenantBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  return db.tenant.findUnique({ where: { slug }, select: { id: true, slug: true } })
}

/**
 * Signs a widget session token (F-08 SessionTokenService via @wren/channels).
 */
export async function signWidgetSessionToken(
  tenantId: string,
  sessionKey: string
): Promise<string> {
  const payload: SessionTokenPayload = { tenantId, sessionKey, issuedAt: Date.now() }
  return signToken(payload, getWidgetSecret(tenantId))
}

/**
 * Verifies a widget session token (F-08 SessionTokenService via @wren/channels).
 */
export async function verifyWidgetSessionToken(
  token: string,
  expectedTenantId: string
): Promise<{ tenantId: string; sessionKey: string; issuedAt: number } | null> {
  const result = verifyToken(token, getWidgetSecret(expectedTenantId))
  if (!result.valid || !result.payload) return null
  if (result.payload.tenantId !== expectedTenantId) return null
  return result.payload
}

/**
 * Retries the last failed assistant turn.
 */
export async function retryLastFailedTurn(
  conversationId: string,
  tenantId: string,
  res: ServerResponse
): Promise<boolean> {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true, userId: true },
  })
  if (!conversation) return false

  const lastError = await db.message.findFirst({
    where: { conversationId, status: 'error' },
    orderBy: { createdAt: 'desc' },
  })
  if (!lastError) return false

  const lastUser = await db.message.findFirst({
    where: { conversationId, role: 'user', createdAt: { lt: lastError.createdAt } },
    orderBy: { createdAt: 'desc' },
  })
  if (!lastUser) return false

  // Delete the failed message (prevents duplicate)
  await db.message.delete({ where: { id: lastError.id } })

  // Re-run the pipeline with the original user message content
  await sendMessageStream(
    {
      conversationId,
      tenantId,
      userId: conversation.userId,
      content: lastUser.content,
    },
    res
  )

  return true
}
