/**
 * Chat orchestration service — stub for Forge's F-02/F-03/F-04/F-05/F-06.
 *
 * ⚠️  STUB — This file is a placeholder so Spark's routes can compile.
 *     Forge will replace this with the full implementation (F-02 through F-06).
 *     Do NOT delete or overwrite this stub arbitrarily — coordinate with Forge.
 *
 * Contracts defined here match what Spark's routes expect to call.
 * When Forge implements the real service, these signatures must be preserved.
 */
import type { ServerResponse } from 'node:http'
// NOTE: Prisma types imported from @wren/db — requires Forge's F-01 (schema + migration) to be present.
// Until F-01 is merged, `db.conversation`, `db.message`, etc. will not resolve.
// This file compiles cleanly once the Prisma schema is generated.
import { db } from '@wren/db'
import { createId } from '@paralleldrive/cuid2'

// ── Types (mirrors Prisma models from F-01 schema) ───────────────────────────

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
  model: string | null
  kbDefaults: unknown
  createdAt: Date
  updatedAt: Date
}

export interface CreateConversationInput {
  tenantId: string
  userId: string
  channel?: string
  documentIds?: string[]
}

// Prisma.ConversationWhereInput — available after Forge's F-01 generates the client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConversationWhereInput = Record<string, any>

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
  model?: string | null
}

// ── Service functions (STUB implementations) ─────────────────────────────────

/**
 * STUB — Forge replaces with real implementation (F-01/F-02/F-05).
 * Lists conversations for a tenant, ordered by lastMessageAt desc.
 */
export async function listConversations(
  input: ListConversationsInput
): Promise<{ data: ConversationSummary[]; nextCursor: string | null }> {
  // STUB: Forge implements with FTS search support (F-10) and cursor pagination
  const where: ConversationWhereInput = {
    tenantId: input.tenantId,
    status: 'active',
    ...(input.channel ? { channel: input.channel } : {}),
  }

  const limit = input.limit ?? 20
  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
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
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return { data: page as ConversationSummary[], nextCursor }
}

/**
 * STUB — Forge replaces with real implementation (F-02/F-05).
 * Creates a new conversation, snapshotting systemPrompt from TenantChatSettings.
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationSummary> {
  // STUB: Forge adds systemPromptSnapshot population (F-05) and document attachment
  const conversation = await db.conversation.create({
    data: {
      id: createId(),
      tenantId: input.tenantId,
      userId: input.userId,
      channel: input.channel ?? 'app',
      status: 'active',
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

  // Attach documents if provided
  if (input.documentIds?.length) {
    await db.conversationDocument.createMany({
      data: input.documentIds.map((documentId) => ({
        id: createId(),
        conversationId: conversation.id,
        documentId,
      })),
      skipDuplicates: true,
    })
  }

  return conversation as ConversationSummary
}

/**
 * STUB — Forge replaces with real implementation (F-02/F-03/F-04).
 * Fetches a single conversation with messages and attachments.
 * Validates tenant ownership — throws if tenantId mismatch.
 */
export async function getConversation(
  id: string,
  tenantId: string
): Promise<ConversationDetail | null> {
  const conversation = await db.conversation.findFirst({
    where: { id, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
    },
  })

  return conversation as ConversationDetail | null
}

/**
 * STUB — Forge replaces.
 * Archives a conversation (soft-delete).
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
    data: { status: 'archived' },
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

  return updated as ConversationSummary
}

/**
 * STUB — Forge replaces with real agent runtime integration (F-02/F-03/F-04).
 *
 * Streams an assistant response via SSE into `res`.
 * SSE format:
 *   data: {"type":"chunk","content":"..."}
 *   data: {"type":"citations","citations":[...]}
 *   data: {"type":"done","messageId":"...","tokenInput":N,"tokenOutput":N}
 *   data: {"type":"error","message":"...","code":"..."}
 *
 * Guarantees:
 * - User message persisted BEFORE stream opens
 * - Assistant message created with status:"streaming" before first chunk
 * - On complete: message updated to status:"complete" with token counts
 * - On error: message updated to status:"error" with errorMessage
 */
export async function sendMessageStream(
  input: SendMessageInput,
  res: ServerResponse
): Promise<void> {
  // STUB: Forge implements full agent runtime pipeline here (F-02, F-03, F-04)
  // Persist user message first
  const userMessage = await db.message.create({
    data: {
      id: createId(),
      conversationId: input.conversationId,
      role: 'user',
      content: input.content,
      contentText: input.content,
      status: 'complete',
    },
  })

  // Update conversation lastMessageAt
  await db.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  })

  // Create assistant message as streaming
  const assistantMessage = await db.message.create({
    data: {
      id: createId(),
      conversationId: input.conversationId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    },
  })

  // STUB: write a placeholder response — Forge replaces with real LLM streaming
  const stubText = '[STUB] Agent runtime not yet wired. Forge implements F-02/F-03/F-04.'
  res.write(`data: ${JSON.stringify({ type: 'chunk', content: stubText })}\n\n`)

  // Finalise assistant message
  await db.message.update({
    where: { id: assistantMessage.id },
    data: {
      content: stubText,
      contentText: stubText,
      status: 'complete',
      tokenInput: 0,
      tokenOutput: 0,
    },
  })

  await db.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  })

  res.write(
    `data: ${JSON.stringify({
      type: 'done',
      messageId: assistantMessage.id,
      userMessageId: userMessage.id,
      tokenInput: 0,
      tokenOutput: 0,
    })}\n\n`
  )
}

/**
 * STUB — Forge replaces.
 * Lists paginated messages for a conversation (cursor-based, newest first).
 */
export async function listMessages(
  conversationId: string,
  tenantId: string,
  cursor?: string,
  limit = 50
): Promise<{ data: MessageRecord[]; nextCursor: string | null }> {
  // Verify conversation belongs to tenant
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  })
  if (!conversation) return { data: [], nextCursor: null }

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return { data: page as MessageRecord[], nextCursor }
}

/**
 * STUB — Forge replaces.
 * Attaches a KB document to a conversation.
 * Validates document belongs to the same tenant's KB.
 */
export async function attachDocument(
  input: AttachDocumentInput
): Promise<AttachmentRecord | null> {
  // Validate conversation + document both belong to tenant
  const [conversation, kb] = await Promise.all([
    db.conversation.findFirst({
      where: { id: input.conversationId, tenantId: input.tenantId },
      select: { id: true },
    }),
    db.knowledgeBase.findUnique({
      where: { tenantId: input.tenantId },
      select: { id: true },
    }),
  ])

  if (!conversation) return null

  if (kb) {
    const document = await db.kbDocument.findFirst({
      where: { id: input.documentId, knowledgeBaseId: kb.id },
      select: { id: true },
    })
    if (!document) return null
  }

  const attachment = await db.conversationDocument.upsert({
    where: {
      conversationId_documentId: {
        conversationId: input.conversationId,
        documentId: input.documentId,
      },
    },
    create: {
      id: createId(),
      conversationId: input.conversationId,
      documentId: input.documentId,
    },
    update: {},
  })

  return attachment as AttachmentRecord
}

/**
 * STUB — Forge replaces.
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

  const deleted = await db.conversationDocument.deleteMany({
    where: { conversationId, documentId },
  })

  return deleted.count > 0
}

/**
 * STUB — Forge replaces (F-05).
 * Gets (or upserts) TenantChatSettings for a tenant.
 */
export async function getChatSettings(
  tenantId: string
): Promise<TenantChatSettingsRecord> {
  const settings = await db.tenantChatSettings.upsert({
    where: { tenantId },
    create: {
      id: createId(),
      tenantId,
      allowedOrigins: [],
    },
    update: {},
  })

  return settings as unknown as TenantChatSettingsRecord
}

/**
 * STUB — Forge replaces.
 * Updates TenantChatSettings for a tenant.
 */
export async function updateChatSettings(
  input: UpdateChatSettingsInput
): Promise<TenantChatSettingsRecord> {
  const { tenantId, ...data } = input

  const settings = await db.tenantChatSettings.upsert({
    where: { tenantId },
    create: {
      id: createId(),
      tenantId,
      allowedOrigins: [],
      ...data,
    },
    update: data,
  })

  return settings as unknown as TenantChatSettingsRecord
}

/**
 * STUB — Forge replaces (F-08 SessionTokenService).
 * Resolves a tenantId from a tenantSlug.
 */
export async function resolveTenantBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  return db.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
}

/**
 * STUB — Forge replaces (F-08 SessionTokenService).
 * Signs a widget session token.
 * Returns a signed JWT-like token for the widget session.
 * Real implementation uses HMAC-SHA256.
 */
export async function signWidgetSessionToken(
  tenantId: string,
  sessionKey: string
): Promise<string> {
  // STUB: Forge implements HMAC-SHA256 signing in SessionTokenService (F-08)
  const payload = { tenantId, sessionKey, issuedAt: Date.now() }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

/**
 * STUB — Forge replaces (F-08 SessionTokenService).
 * Verifies a widget session token.
 * Returns null if invalid or expired.
 */
export async function verifyWidgetSessionToken(
  token: string,
  expectedTenantId: string
): Promise<{ tenantId: string; sessionKey: string; issuedAt: number } | null> {
  try {
    // STUB: Forge implements real HMAC-SHA256 verification
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
      tenantId: string
      sessionKey: string
      issuedAt: number
    }

    // Check expiry (24h)
    const TTL_MS = 24 * 60 * 60 * 1000
    if (Date.now() - payload.issuedAt > TTL_MS) return null
    if (payload.tenantId !== expectedTenantId) return null

    return payload
  } catch {
    return null
  }
}

/**
 * STUB — Forge replaces.
 * Retries the last failed assistant turn in a conversation.
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

  // Find last failed message
  const lastErrorMsg = await db.message.findFirst({
    where: { conversationId, status: 'error' },
    orderBy: { createdAt: 'desc' },
  })
  if (!lastErrorMsg) return false

  // Find last user message before the error
  const lastUserMsg = await db.message.findFirst({
    where: {
      conversationId,
      role: 'user',
      createdAt: { lt: lastErrorMsg.createdAt },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!lastUserMsg) return false

  // Delete the failed message and re-run
  await db.message.delete({ where: { id: lastErrorMsg.id } })

  // STUB: Forge re-runs agent pipeline here
  await sendMessageStream(
    {
      conversationId,
      tenantId,
      userId: conversation.userId,
      content: lastUserMsg.content,
    },
    res
  )

  return true
}
