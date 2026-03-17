/**
 * WebChat widget public routes — S-09.
 *
 * These routes are PUBLIC (no Clerk JWT). They are secured by:
 *   1. Origin header validation against TenantChatSettings.allowedOrigins
 *   2. HMAC-signed session token (issued by POST /widget/:tenantSlug/session)
 *
 * Routes:
 *   GET  /widget/:tenantSlug/bootstrap.js       — embed script loader (F-09, Forge)
 *   GET  /widget/:tenantSlug/config             — public branding config
 *   POST /widget/:tenantSlug/session            — create/resume guest session
 *   GET  /widget/:tenantSlug/conversations/:id  — get widget conversation
 *   POST /widget/:tenantSlug/conversations/:id/messages — SSE stream
 *
 * Security rules enforced here:
 * - allowedOrigins check on EVERY request (not just session creation)
 * - Session token validated before any data access
 * - Internal tenantId never exposed in responses — tenantSlug only
 * - Cross-tenant isolation: session key maps to a specific tenantId
 *
 * NOTE: signWidgetSessionToken / verifyWidgetSessionToken are stubs.
 *       Forge replaces with HMAC-SHA256 via SessionTokenService (F-08).
 */
import { createId } from '@paralleldrive/cuid2'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  createConversation,
  detachDocument,
  attachDocument,
  getConversation,
  getChatSettings,
  resolveTenantBySlug,
  sendMessageStream,
  signWidgetSessionToken,
  verifyWidgetSessionToken,
} from '../../services/chat'
import { generateBootstrapScript, getBootstrapConfigCached } from './bootstrap'

// ── Zod schemas ───────────────────────────────────────────────────────────────

const SessionCreateBodySchema = z.object({
  // Optional: resume an existing session by providing a prior sessionKey
  sessionKey: z.string().min(1).max(128).optional(),
})

const WidgetSendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(32_000),
})

const WidgetAttachDocumentBodySchema = z.object({
  documentId: z.string().min(1),
})

// ── Origin validation ─────────────────────────────────────────────────────────

/**
 * Validates the request Origin header against the tenant's allowedOrigins list.
 * Returns true if allowed, false if denied.
 *
 * NOTE: Origin is defence-in-depth for iframe embedding.
 *       The session token is the real auth gate for data operations.
 */
function isOriginAllowed(request: FastifyRequest, allowedOrigins: string[]): boolean {
  // If no origins configured, deny all (explicit allow-list required)
  if (!allowedOrigins.length) return false

  const origin = request.headers['origin']
  if (!origin) return false

  return allowedOrigins.includes(origin)
}

/**
 * Write SSE error and end the response.
 */
function writeSseError(reply: FastifyReply, message: string, code: string): void {
  reply.raw.write(`data: ${JSON.stringify({ type: 'error', message, code })}\n\n`)
  reply.raw.end()
}

/**
 * Set SSE response headers.
 */
function setSseHeaders(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    // CORS: allow widget iframe from any origin (controlled by allowedOrigins check above)
    'Access-Control-Allow-Origin': '*',
  })
}

// ── Route registration ────────────────────────────────────────────────────────

export async function widgetRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /widget/:tenantSlug/config ─────────────────────────────────────
  // PUBLIC — origin-gated. Returns branding config for the widget iframe.
  // bootstrap.js calls this on load. Cached at CDN/proxy level.
  //
  // Response never includes tenantId — only safe public branding fields.
  fastify.get(
    '/:tenantSlug/config',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)

      // Origin check
      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      // Return only safe public fields — NO internal tenantId
      return reply.send({
        data: {
          widgetTitle: settings.widgetTitle ?? 'Chat',
          launcherLabel: settings.launcherLabel ?? 'Chat with us',
          welcomeMessage: settings.welcomeMessage ?? null,
          logoUrl: settings.logoUrl ?? null,
          brandColor: settings.brandColor ?? '#0F172A',
          accentColor: settings.accentColor ?? '#22C55E',
          tenantSlug,
        },
      })
    }
  )

  // ── GET /widget/:tenantSlug/bootstrap.js ───────────────────────────────
  // PUBLIC — no auth, no origin check (must load from any page to bootstrap).
  // Forge implements full version (F-09). This stub serves a minimal loader.
  //
  // NOTE: Forge's F-09 will replace/extend this with full launcher injection.
  //       No DB calls here — config is cached, response < 100ms target.
  fastify.get(
    '/:tenantSlug/bootstrap.js',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string }
      const apiBaseUrl = process.env['API_BASE_URL'] ?? 'https://app.usewren.ai'

      // F-09: Full bootstrap.js — uses cached config (TTL 60s, no DB call on cache hit)
      const config = await getBootstrapConfigCached(tenantSlug)
      if (!config) {
        return void reply
          .type('application/javascript')
          .header('Cache-Control', 'no-store')
          .send('// Wren: tenant not found\n')
      }

      const script = generateBootstrapScript(tenantSlug, config, apiBaseUrl)

      return void reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=60, s-maxage=60')
        .header('X-Content-Type-Options', 'nosniff')
        .send(script)
    }
  )

  // ── POST /widget/:tenantSlug/session ───────────────────────────────────
  // PUBLIC — origin-gated. Creates or resumes a guest widget session.
  // Returns a signed session token (HMAC-SHA256, 24h TTL).
  fastify.post(
    '/:tenantSlug/session',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)

      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const bodyResult = SessionCreateBodySchema.safeParse(request.body ?? {})
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      // Assign or reuse session key — stored in browser sessionStorage by the widget
      const sessionKey = bodyResult.data.sessionKey ?? createId()

      // Sign the session token — Forge replaces stub with HMAC-SHA256 (F-08)
      const token = await signWidgetSessionToken(tenant.id, sessionKey)

      // Return token — never expose internal tenantId
      return reply.status(201).send({
        data: {
          token,
          sessionKey,
          expiresIn: 86400, // 24h in seconds
          tenantSlug,
        },
      })
    }
  )

  // ── GET /widget/:tenantSlug/conversations/:id ──────────────────────────
  // Origin-gated + session token required.
  // Returns conversation history scoped to the session's sessionKey.
  fastify.get(
    '/:tenantSlug/conversations/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug, id } = request.params as { tenantSlug: string; id: string }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)

      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const session = await validateSessionToken(request, reply, tenant.id)
      if (!session) return // reply already sent

      const conversation = await getConversation(id, tenant.id)
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' })
      }

      // Ensure the conversation belongs to this widget session
      if (conversation.userId !== session.sessionKey) {
        return reply.status(403).send({ error: 'Access denied' })
      }

      // Strip internal tenantId from response
      const { tenantId: _tenantId, ...safeConversation } = conversation
      return reply.send({ data: safeConversation })
    }
  )

  // ── POST /widget/:tenantSlug/conversations ─────────────────────────────
  // Origin-gated + session token required.
  // Creates a new widget conversation for the guest session.
  fastify.post(
    '/:tenantSlug/conversations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)

      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const session = await validateSessionToken(request, reply, tenant.id)
      if (!session) return // reply already sent

      const conversation = await createConversation({
        tenantId: tenant.id,
        userId: session.sessionKey,
        channel: 'webchat',
      })

      // Never expose internal tenantId
      const { tenantId: _tenantId, ...safeConversation } = conversation
      return reply.status(201).send({ data: safeConversation })
    }
  )

  // ── POST /widget/:tenantSlug/conversations/:id/messages ───────────────
  // Origin-gated + session token required. SSE stream response.
  // Delegates to the same sendMessageStream pipeline as app chat.
  fastify.post(
    '/:tenantSlug/conversations/:id/messages',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug, id } = request.params as { tenantSlug: string; id: string }

      // Validate message body BEFORE opening SSE to return clean 400
      const bodyResult = WidgetSendMessageBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)

      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const session = await validateSessionToken(request, reply, tenant.id)
      if (!session) return // reply already sent

      // Verify conversation belongs to this session
      const conversation = await getConversation(id, tenant.id)
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' })
      }

      if (conversation.userId !== session.sessionKey) {
        return reply.status(403).send({ error: 'Access denied' })
      }

      if (conversation.status === 'archived') {
        return reply.status(422).send({ error: 'Cannot send message to archived conversation' })
      }

      // Open SSE stream
      setSseHeaders(reply)

      let streamAborted = false
      reply.raw.on('close', () => {
        streamAborted = true
      })

      try {
        await sendMessageStream(
          {
            conversationId: id,
            tenantId: tenant.id,
            userId: session.sessionKey,
            content: bodyResult.data.content,
          },
          reply.raw
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream error'
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

  // ── POST /widget/:tenantSlug/conversations/:id/attachments ────────────
  // Origin-gated + session token required.
  // Attaches a KB document to a widget conversation.
  fastify.post(
    '/:tenantSlug/conversations/:id/attachments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug, id } = request.params as { tenantSlug: string; id: string }

      const bodyResult = WidgetAttachDocumentBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)
      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const session = await validateSessionToken(request, reply, tenant.id)
      if (!session) return

      // Verify conversation belongs to this session
      const conversation = await getConversation(id, tenant.id)
      if (!conversation || conversation.userId !== session.sessionKey) {
        return reply.status(403).send({ error: 'Conversation not found or access denied' })
      }

      const attachment = await attachDocument({
        conversationId: id,
        tenantId: tenant.id,
        documentId: bodyResult.data.documentId,
      })

      if (!attachment) {
        return reply.status(403).send({ error: 'Document not found or access denied' })
      }

      return reply.status(201).send({ data: { conversationId: id, documentId: bodyResult.data.documentId } })
    }
  )

  // ── DELETE /widget/:tenantSlug/conversations/:id/attachments/:docId ───
  // Origin-gated + session token required.
  fastify.delete(
    '/:tenantSlug/conversations/:id/attachments/:documentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug, id, documentId } = request.params as {
        tenantSlug: string
        id: string
        documentId: string
      }

      const tenant = await resolveTenantBySlug(tenantSlug)
      if (!tenant) {
        return reply.status(404).send({ error: 'Widget not found' })
      }

      const settings = await getChatSettings(tenant.id)
      if (!isOriginAllowed(request, settings.allowedOrigins)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      const session = await validateSessionToken(request, reply, tenant.id)
      if (!session) return

      const conversation = await getConversation(id, tenant.id)
      if (!conversation || conversation.userId !== session.sessionKey) {
        return reply.status(403).send({ error: 'Conversation not found or access denied' })
      }

      await detachDocument(id, documentId, tenant.id)
      return reply.send({ data: { conversationId: id, documentId } })
    }
  )
}

// ── Session token helpers ─────────────────────────────────────────────────────

/**
 * Extracts and validates the widget session token from the Authorization header.
 * Header format: Authorization: Bearer <token>
 *
 * Returns the decoded session payload, or null (and writes 401 reply) if invalid.
 */
async function validateSessionToken(
  request: FastifyRequest,
  reply: FastifyReply,
  expectedTenantId: string
): Promise<{ tenantId: string; sessionKey: string; issuedAt: number } | null> {
  const authHeader = request.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Session token required' })
    return null
  }

  const token = authHeader.slice(7).trim()
  const session = await verifyWidgetSessionToken(token, expectedTenantId)
  if (!session) {
    reply.status(401).send({ error: 'Invalid or expired session token' })
    return null
  }

  return session
}
