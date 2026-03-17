/**
 * Chat conversation routes — S-01 through S-07.
 *
 * S-01: GET  /chat/conversations        — list conversations (paginated + search)
 * S-02: POST /chat/conversations        — create conversation
 * S-03: GET  /chat/conversations/:id    — get conversation + messages
 * S-04: DELETE /chat/conversations/:id  — archive conversation (soft-delete)
 * S-05: POST /chat/conversations/:id/messages     — send message (SSE stream)
 * S-06: POST /chat/conversations/:id/attachments  — attach KB document
 * S-07: DELETE /chat/conversations/:id/attachments/:documentId — detach document
 *
 * Auth: Clerk JWT via authenticate preHandler. tenantId from request.auth.
 * SSE: reply.raw (Node http.ServerResponse). Client disconnects cleaned up via 'close'.
 * Validation: Zod on all inputs.
 *
 * NOTE: This file imports from services/chat.ts — Forge's F-02/F-03/F-04/F-05/F-06 target.
 * Stub is in place; routes are fully implemented and will work when Forge replaces the stub.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../plugins/auth'
import {
  listConversations,
  createConversation,
  getConversation,
  archiveConversation,
  updateConversation,
  sendMessageStream,
  listMessages,
  attachDocument,
  detachDocument,
  retryLastFailedTurn,
} from '../../services/chat'

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ListConversationsQuerySchema = z.object({
  q: z.string().trim().min(1).max(500).optional(),
  channel: z.enum(['app', 'webchat']).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const CreateConversationBodySchema = z.object({
  channel: z.enum(['app', 'webchat']).default('app'),
  documentIds: z.array(z.string().min(1)).max(20).optional(),
  // Optional initial message — if provided, creates conversation and sends first message
  // SSE for initial message is NOT streamed on creation (would require a different endpoint)
  // Client should create then immediately POST to /messages
})

const ListMessagesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const SendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(32_000),
})

const UpdateConversationBodySchema = z.object({
  title: z.string().trim().min(1).max(80),
})

const AttachDocumentBodySchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(20),
})

// ── SSE helpers ───────────────────────────────────────────────────────────────

function setSseHeaders(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
}

function writeSseError(reply: FastifyReply, message: string, code: string): void {
  reply.raw.write(`data: ${JSON.stringify({ type: 'error', message, code })}\n\n`)
  reply.raw.end()
}

// ── Route registration ────────────────────────────────────────────────────────

export async function chatConversationRoutes(fastify: FastifyInstance): Promise<void> {
  // ── S-01: GET /chat/conversations ─────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryResult = ListConversationsQuerySchema.safeParse(getQuery(request))
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: queryResult.error.flatten().fieldErrors,
        })
      }

      const { q, channel, cursor, limit } = queryResult.data
      const result = await listConversations({
        tenantId: request.auth.tenantId,
        q,
        channel,
        cursor,
        limit,
      })

      return reply.send(result)
    }
  )

  // ── S-02: POST /chat/conversations ───────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = CreateConversationBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const conversation = await createConversation({
        tenantId: request.auth.tenantId,
        userId: request.auth.clerkUserId,
        channel: bodyResult.data.channel,
        documentIds: bodyResult.data.documentIds,
      })

      return reply.status(201).send({ data: conversation })
    }
  )

  // ── S-03: GET /chat/conversations/:id ────────────────────────────────────
  fastify.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const conversation = await getConversation(id, request.auth.tenantId)
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' })
      }

      return reply.send({ data: conversation })
    }
  )

  // ── S-04: DELETE /chat/conversations/:id ─────────────────────────────────
  fastify.delete(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const result = await archiveConversation(id, request.auth.tenantId)
      if (!result) {
        // Return 403 for owned resources per security spec (not 404)
        return reply.status(403).send({ error: 'Conversation not found or access denied' })
      }

      return reply.send({ data: result })
    }
  )

  // ── S-08: PATCH /chat/conversations/:id (title update) ───────────────────
  fastify.patch(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const bodyResult = UpdateConversationBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const result = await updateConversation({
        id,
        tenantId: request.auth.tenantId,
        title: bodyResult.data.title,
      })

      if (!result) {
        return reply.status(403).send({ error: 'Conversation not found or access denied' })
      }

      return reply.send({ data: result })
    }
  )

  // ── S-05: POST /chat/conversations/:id/messages (SSE stream) ─────────────
  fastify.post(
    '/:id/messages',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const bodyResult = SendMessageBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      // Verify conversation exists and belongs to this tenant before opening SSE
      const conversation = await getConversation(id, request.auth.tenantId)
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' })
      }

      if (conversation.status === 'archived') {
        return reply.status(422).send({
          error: 'Cannot send message to archived conversation',
        })
      }

      // Open SSE stream
      setSseHeaders(reply)

      // Handle client disconnect — clean up any active stream
      let streamAborted = false
      reply.raw.on('close', () => {
        streamAborted = true
        // Forge's real service will check this flag to abort agent pipeline
      })

      try {
        await sendMessageStream(
          {
            conversationId: id,
            tenantId: request.auth.tenantId,
            userId: request.auth.clerkUserId,
            content: bodyResult.data.content,
          },
          reply.raw
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error during streaming'
        if (!streamAborted) {
          writeSseError(reply, message, 'AGENT_ERROR')
          return
        }
      }

      if (!streamAborted) {
        reply.raw.end()
      }
    }
  )

  // ── GET /chat/conversations/:id/messages (paginated history) ─────────────
  fastify.get(
    '/:id/messages',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const queryResult = ListMessagesQuerySchema.safeParse(getQuery(request))
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: queryResult.error.flatten().fieldErrors,
        })
      }

      // Verify conversation ownership
      const conversation = await getConversation(id, request.auth.tenantId)
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' })
      }

      const result = await listMessages(
        id,
        request.auth.tenantId,
        queryResult.data.cursor,
        queryResult.data.limit
      )

      return reply.send(result)
    }
  )

  // ── POST /chat/conversations/:id/retry ────────────────────────────────────
  fastify.post(
    '/:id/retry',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      // Verify conversation belongs to tenant
      const conversation = await getConversation(id, request.auth.tenantId)
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' })
      }

      // Open SSE stream for the retry response
      setSseHeaders(reply)

      let streamAborted = false
      reply.raw.on('close', () => {
        streamAborted = true
      })

      try {
        const retried = await retryLastFailedTurn(id, request.auth.tenantId, reply.raw)
        if (!retried) {
          if (!streamAborted) {
            writeSseError(reply, 'No failed turn found to retry', 'NO_FAILED_TURN')
            return
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Retry failed'
        if (!streamAborted) {
          writeSseError(reply, message, 'AGENT_ERROR')
          return
        }
      }

      if (!streamAborted) {
        reply.raw.end()
      }
    }
  )

  // ── S-06: POST /chat/conversations/:id/attachments ───────────────────────
  fastify.post(
    '/:id/attachments',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const bodyResult = AttachDocumentBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const attachments = await Promise.all(
        bodyResult.data.documentIds.map((documentId) =>
          attachDocument({
            conversationId: id,
            tenantId: request.auth.tenantId,
            documentId,
          })
        )
      )

      // If any attachment failed (null), the document was not found or access denied
      if (attachments.some((a) => a === null)) {
        return reply.status(403).send({
          error: 'One or more documents not found, or access denied',
        })
      }

      return reply.status(201).send({ data: attachments })
    }
  )

  // ── S-07: DELETE /chat/conversations/:id/attachments/:documentId ──────────
  fastify.delete(
    '/:id/attachments/:documentId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, documentId } = request.params as { id: string; documentId: string }

      const removed = await detachDocument(id, documentId, request.auth.tenantId)
      if (!removed) {
        return reply.status(403).send({
          error: 'Attachment not found or access denied',
        })
      }

      return reply.send({ data: { conversationId: id, documentId } })
    }
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getQuery(request: FastifyRequest): Record<string, unknown> {
  return request.query as Record<string, unknown>
}
