/**
 * Chat orchestration service — Sprint 3 (F-02).
 *
 * Central coordination point for all chat operations.
 * Handles conversation lifecycle, KB retrieval, agent runtime wiring,
 * streaming pipeline, and background job dispatch.
 *
 * Architecture rules (non-negotiable):
 * - ALL LLM calls via /packages/llm → LiteLLM proxy (ADR-005)
 * - Custom agent runtime only — no LangChain/CrewAI (ADR-007)
 * - Every DB query scoped by tenantId (ADR-003)
 * - User message persisted BEFORE SSE stream opens
 * - Assistant message created as status:streaming BEFORE first chunk
 * - On stream complete → status:complete with token counts
 * - On stream error → status:error with errorMessage
 * - billing:meter job enqueued after every successful assistant turn
 */

import { db } from '@wren/db'
import type { Conversation, Message, ConversationDocument } from '@wren/db'
import { createId } from '@paralleldrive/cuid2'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { retrieveChunks, type KbChunkResult } from '../kb/retrieval'
import { ChatAgent } from '@wren/agents'
import type { ConversationContext, AgentTurnResult } from '@wren/agents'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateConversationOptions {
  tenantId: string
  userId: string
  channel?: string
  documentIds?: string[]
  initialMessage?: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
  attachments: (ConversationDocument & { document: { id: string; title: string; fileName: string } })[]
}

export interface ListConversationsOptions {
  tenantId: string
  userId?: string
  channel?: string
  status?: string
  q?: string
  cursor?: string
  limit?: number
}

export interface SendMessageOptions {
  conversationId: string
  tenantId: string
  userId: string
  content: string
  /** Redis connection for message history */
  redis: Redis
  /** LiteLLM config forwarded from API config */
  litellmBaseUrl: string
  litellmApiKey: string
  /** BullMQ queue reference for billing:meter and title jobs */
  queues: {
    billingMeter: Queue
    conversationTitle: Queue
  }
}

export interface StreamChunk {
  type: 'chunk' | 'citations' | 'done' | 'error'
  content?: string
  citations?: CitationRef[]
  messageId?: string
  tokenInput?: number
  tokenOutput?: number
  message?: string
  code?: string
}

export interface CitationRef {
  documentId: string
  chunkId: string
  label: string
  documentTitle: string
  documentFileName: string
  excerpt: string
  pageNumber?: number
  chunkIndex: number
}

// ─── Conversation CRUD ────────────────────────────────────────────────────────

/**
 * Create a new conversation, capturing the tenant's systemPrompt snapshot (F-05).
 * Optionally attaches KB documents.
 */
export async function createConversation(
  opts: CreateConversationOptions
): Promise<Conversation> {
  const { tenantId, userId, channel = 'app', documentIds = [] } = opts

  // F-05: Capture systemPrompt snapshot at creation time
  const settings = await db.tenantChatSettings.findUnique({
    where: { tenantId },
    select: { systemPrompt: true },
  })
  const systemPromptSnapshot = settings?.systemPrompt ?? null

  const conversation = await db.conversation.create({
    data: {
      id: createId(),
      tenantId,
      userId,
      channel,
      status: 'active',
      systemPromptSnapshot,
    },
  })

  // Attach documents if provided (validate they belong to this tenant's KB)
  if (documentIds.length > 0) {
    await attachDocuments(conversation.id, tenantId, documentIds)
  }

  return conversation
}

/**
 * Get a conversation with all messages and document attachments.
 * Enforces tenantId scope.
 */
export async function getConversation(
  conversationId: string,
  tenantId: string
): Promise<ConversationWithMessages | null> {
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: {
          document: {
            select: { id: true, title: true, fileName: true },
          },
        },
      },
    },
  })
  return conv as ConversationWithMessages | null
}

/**
 * List conversations for a tenant with optional filtering and pagination.
 * Supports full-text search on title + message content.
 */
export async function listConversations(
  opts: ListConversationsOptions
): Promise<{ conversations: Conversation[]; nextCursor: string | null }> {
  const { tenantId, userId, channel, status = 'active', q, cursor, limit = 20 } = opts

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { tenantId, status }
  if (userId) where.userId = userId
  if (channel) where.channel = channel

  // FTS search: find conversation IDs that match query
  let conversationIds: string[] | undefined
  if (q && q.trim().length > 0) {
    const sanitised = q.trim().replace(/[^\w\s]/g, '')
    const ftsResults = await db.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT c."id"
      FROM "Conversation" c
      LEFT JOIN "Message" m ON m."conversationId" = c."id"
      WHERE c."tenantId" = ${tenantId}
        AND (
          to_tsvector('english', COALESCE(c."title", '')) @@ plainto_tsquery('english', ${sanitised})
          OR to_tsvector('english', COALESCE(m."contentText", '')) @@ plainto_tsquery('english', ${sanitised})
        )
      LIMIT 200
    `
    conversationIds = ftsResults.map((r) => r.id)
    if (conversationIds.length === 0) {
      return { conversations: [], nextCursor: null }
    }
    where.id = { in: conversationIds }
  }

  // Cursor-based pagination
  if (cursor) {
    where.lastMessageAt = { lt: new Date(cursor) }
  }

  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: limit + 1,
  })

  let nextCursor: string | null = null
  if (conversations.length > limit) {
    conversations.pop()
    const last = conversations[conversations.length - 1]
    nextCursor = last?.lastMessageAt?.toISOString() ?? null
  }

  return { conversations, nextCursor }
}

/**
 * Archive a conversation (soft delete).
 */
export async function archiveConversation(
  conversationId: string,
  tenantId: string
): Promise<Conversation | null> {
  // Verify ownership first
  const existing = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
  })
  if (!existing) return null

  return db.conversation.update({
    where: { id: conversationId },
    data: { status: 'archived', updatedAt: new Date() },
  })
}

// ─── Document Attachment ──────────────────────────────────────────────────────

/**
 * Attach KB documents to a conversation.
 * Validates documents belong to the tenant.
 */
export async function attachDocuments(
  conversationId: string,
  tenantId: string,
  documentIds: string[]
): Promise<void> {
  // Validate documents belong to this tenant's KB
  const tenantKb = await db.knowledgeBase.findUnique({
    where: { tenantId },
    select: { id: true },
  })
  if (!tenantKb) throw new Error('Tenant KB not found')

  const validDocs = await db.kbDocument.findMany({
    where: {
      id: { in: documentIds },
      knowledgeBaseId: tenantKb.id,
      status: 'ready',
    },
    select: { id: true },
  })
  const validIds = new Set(validDocs.map((d) => d.id))

  const links = documentIds
    .filter((id) => validIds.has(id))
    .map((documentId) => ({
      id: createId(),
      conversationId,
      documentId,
    }))

  if (links.length > 0) {
    await db.conversationDocument.createMany({
      data: links,
      skipDuplicates: true,
    })
  }
}

/**
 * Detach a KB document from a conversation.
 */
export async function detachDocument(
  conversationId: string,
  tenantId: string,
  documentId: string
): Promise<void> {
  // Verify conversation ownership
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  })
  if (!conv) throw new Error('Conversation not found or access denied')

  await db.conversationDocument.deleteMany({
    where: { conversationId, documentId },
  })
}

// ─── Message Pipeline ─────────────────────────────────────────────────────────

/**
 * Send a user message and stream the assistant response.
 *
 * Streaming contract:
 * 1. Persist user message immediately (before stream opens)
 * 2. Create assistant message as status:streaming
 * 3. Yield SSE chunks as they arrive from agent runtime
 * 4. On complete: update assistant message to status:complete with tokens
 * 5. On error: update assistant message to status:error
 * 6. Enqueue billing:meter job after successful turn
 * 7. Enqueue title generation job after first user message
 */
export async function* sendMessage(
  opts: SendMessageOptions
): AsyncGenerator<StreamChunk> {
  const {
    conversationId,
    tenantId,
    userId,
    content,
    redis,
    litellmBaseUrl,
    litellmApiKey,
    queues,
  } = opts

  // Verify conversation belongs to tenant and is active
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, tenantId, status: 'active' },
    include: {
      attachments: {
        select: { documentId: true },
      },
    },
  })

  if (!conversation) {
    yield { type: 'error', message: 'Conversation not found or not active', code: 'CONV_NOT_FOUND' }
    return
  }

  // 1. Persist user message BEFORE opening stream
  const userMessage = await db.message.create({
    data: {
      id: createId(),
      conversationId,
      role: 'user',
      content,
      contentText: content, // plain text = content for user messages
      status: 'complete',
    },
  })

  // Update conversation lastMessageAt
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

  // F-06: Enqueue title generation after first user message (async, non-blocking)
  const messageCount = await db.message.count({
    where: { conversationId, role: 'user' },
  })
  if (messageCount === 1) {
    await queues.conversationTitle.add('generate-title', {
      conversationId,
      tenantId,
      firstUserMessage: content.slice(0, 500), // truncate for title generation
      litellmBaseUrl,
      litellmApiKey,
    })
  }

  // F-04: Retrieve top-8 KB chunks from attached documents
  const documentIds = conversation.attachments.map((a) => a.documentId)
  let kbChunks: KbChunkResult[] = []
  let citations: CitationRef[] = []

  if (documentIds.length > 0) {
    try {
      kbChunks = await retrieveChunks(content, documentIds, 8)
      citations = kbChunks.map((chunk, idx) => ({
        documentId: chunk.documentId,
        chunkId: chunk.id,
        label: `[${idx + 1}]`,
        documentTitle: chunk.documentTitle,
        documentFileName: chunk.documentFileName,
        excerpt: chunk.content.slice(0, 300),
        pageNumber: chunk.pageNumber ?? undefined,
        chunkIndex: chunk.chunkIndex,
      }))
    } catch (err) {
      console.error('[chat/sendMessage] KB retrieval failed:', err)
      // Non-fatal — proceed without KB context
    }
  }

  // Emit citations event before streaming starts (if we have them)
  if (citations.length > 0) {
    yield { type: 'citations', citations }
  }

  // F-03: Build conversation context for agent runtime
  const context: ConversationContext = {
    tenantId,
    userId,
    conversationId,
    channel: conversation.channel as 'app' | 'webchat',
    systemPromptSnapshot: conversation.systemPromptSnapshot ?? undefined,
    kbChunks,
    citations,
    litellmBaseUrl,
    litellmApiKey,
  }

  // 3. Stream agent response
  let fullContent = ''
  let tokenInput = 0
  let tokenOutput = 0
  let streamError: string | null = null

  try {
    const agent = new ChatAgent({ redis, context })

    for await (const chunk of agent.stream(content)) {
      if (chunk.type === 'chunk' && chunk.content) {
        fullContent += chunk.content
        yield { type: 'chunk', content: chunk.content }
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
    // 5. Update assistant message to status:error
    await db.message.update({
      where: { id: assistantMessage.id },
      data: {
        status: 'error',
        errorMessage: streamError,
        content: fullContent, // preserve any partial content
      },
    })
    yield { type: 'error', message: streamError, code: 'AGENT_ERROR' }
    return
  }

  // 4. Update assistant message to status:complete
  const citationsJson = citations.length > 0 ? citations : null
  await db.message.update({
    where: { id: assistantMessage.id },
    data: {
      content: fullContent,
      contentText: fullContent, // store plain text for search
      status: 'complete',
      tokenInput,
      tokenOutput,
      citations: citationsJson ? JSON.parse(JSON.stringify(citationsJson)) : undefined,
    },
  })

  // Update conversation lastMessageAt
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), updatedAt: new Date() },
  })

  // 6. Enqueue billing:meter job
  await queues.billingMeter.add('meter', {
    tenantId,
    conversationId,
    messageId: assistantMessage.id,
    model: context.litellmApiKey, // model resolved by agent runtime
    tokenInput,
    tokenOutput,
    timestamp: new Date().toISOString(),
  })

  yield {
    type: 'done',
    messageId: assistantMessage.id,
    tokenInput,
    tokenOutput,
  }
}

/**
 * Retry the last failed assistant turn in a conversation.
 */
export async function retryLastFailedTurn(
  conversationId: string,
  tenantId: string,
  redis: Redis,
  litellmBaseUrl: string,
  litellmApiKey: string,
  queues: SendMessageOptions['queues']
): Promise<{ userMessage: Message; canRetry: boolean }> {
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
  })
  if (!conv) throw new Error('Conversation not found')

  // Find last error message and its preceding user message
  const lastError = await db.message.findFirst({
    where: { conversationId, role: 'assistant', status: 'error' },
    orderBy: { createdAt: 'desc' },
  })
  if (!lastError) return { userMessage: {} as Message, canRetry: false }

  const lastUser = await db.message.findFirst({
    where: {
      conversationId,
      role: 'user',
      createdAt: { lt: lastError.createdAt },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!lastUser) return { userMessage: {} as Message, canRetry: false }

  // Delete the failed assistant message so retry doesn't create a duplicate
  await db.message.delete({ where: { id: lastError.id } })

  return { userMessage: lastUser, canRetry: true }
}

/**
 * Get paginated message history for a conversation.
 */
export async function getMessages(
  conversationId: string,
  tenantId: string,
  opts: { cursor?: string; limit?: number } = {}
): Promise<{ messages: Message[]; nextCursor: string | null }> {
  const { cursor, limit = 50 } = opts

  // Verify conversation ownership
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  })
  if (!conv) throw new Error('Conversation not found or access denied')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { conversationId }
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) }
  }

  const messages = await db.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  })

  let nextCursor: string | null = null
  if (messages.length > limit) {
    messages.pop()
    const last = messages[messages.length - 1]
    nextCursor = last?.createdAt.toISOString() ?? null
  }

  return { messages: messages.reverse(), nextCursor }
}
