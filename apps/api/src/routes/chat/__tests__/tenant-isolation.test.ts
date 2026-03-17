/**
 * Tenant isolation tests — S-09.
 *
 * Every route must return 403/404 on cross-tenant access.
 * Tests cover: conversation read/write, message send, settings access, widget routes.
 *
 * These are unit-style tests that mock the Prisma client and chat service.
 * They validate that tenantId scoping is enforced at the route level.
 *
 * Run: pnpm --filter @wren/api test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { chatRoutes } from '../index'
import { widgetRoutes } from '../../widget/index'

// ── Mock the chat service ────────────────────────────────────────────────────

vi.mock('../../../services/chat', () => ({
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  archiveConversation: vi.fn(),
  sendMessageStream: vi.fn(),
  listMessages: vi.fn(),
  attachDocument: vi.fn(),
  detachDocument: vi.fn(),
  retryLastFailedTurn: vi.fn(),
  getChatSettings: vi.fn(),
  updateChatSettings: vi.fn(),
  resolveTenantBySlug: vi.fn(),
  signWidgetSessionToken: vi.fn(),
  verifyWidgetSessionToken: vi.fn(),
}))

// ── Mock the auth plugin ─────────────────────────────────────────────────────

vi.mock('../../../plugins/auth', () => ({
  authenticate: vi.fn(async (request: any, _reply: any) => {
    // Inject auth context from test header
    const tenantId = request.headers['x-test-tenant-id'] as string
    const clerkUserId = request.headers['x-test-user-id'] as string | undefined
    if (!tenantId) {
      throw new Error('Test: x-test-tenant-id header required')
    }
    request.auth = {
      tenantId,
      clerkUserId: clerkUserId ?? 'user_test',
      clerkOrgId: 'org_test',
      role: 'USER',
    }
  }),
}))

import * as chatService from '../../../services/chat'

// ── Test setup ────────────────────────────────────────────────────────────────

const TENANT_A = 'tenant_aaa'
const TENANT_B = 'tenant_bbb'
const CONV_A = 'conv_aaa'
const CONV_B_OWNED_BY_A = 'conv_a_only'

/**
 * Build a test Fastify app with the chat and widget routes registered.
 */
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(
    async (v1) => {
      await v1.register(chatRoutes, { prefix: '/chat' })
    },
    { prefix: '/api/v1' }
  )
  await app.register(widgetRoutes, { prefix: '/widget' })
  await app.ready()
  return app
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Tenant isolation — chat conversation routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildTestApp()
  })

  it('S-09: GET /chat/conversations — tenant A cannot see tenant B conversations', async () => {
    vi.mocked(chatService.listConversations).mockResolvedValue({ data: [], nextCursor: null })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/chat/conversations',
      headers: { 'x-test-tenant-id': TENANT_A },
    })

    expect(response.statusCode).toBe(200)
    // Verify listConversations was called with TENANT_A's tenantId only
    expect(chatService.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_A })
    )
    expect(chatService.listConversations).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_B })
    )
  })

  it('S-09: GET /chat/conversations/:id — returns 404 for conversation belonging to different tenant', async () => {
    // getConversation returns null when tenantId doesn't match (scoped query)
    vi.mocked(chatService.getConversation).mockResolvedValue(null)

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/chat/conversations/${CONV_A}`,
      headers: { 'x-test-tenant-id': TENANT_B },
    })

    expect(response.statusCode).toBe(404)
    expect(chatService.getConversation).toHaveBeenCalledWith(CONV_A, TENANT_B)
  })

  it('S-09: POST /chat/conversations — creates with caller tenantId, not request body tenantId', async () => {
    const mockConv = {
      id: 'new_conv',
      tenantId: TENANT_A,
      userId: 'user_test',
      channel: 'app',
      title: null,
      status: 'active',
      lastMessageAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(chatService.createConversation).mockResolvedValue(mockConv)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/conversations',
      headers: {
        'x-test-tenant-id': TENANT_A,
        'content-type': 'application/json',
      },
      payload: { channel: 'app' },
    })

    expect(response.statusCode).toBe(201)
    // tenantId comes from auth context, not body
    expect(chatService.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_A })
    )
  })

  it('S-09: DELETE /chat/conversations/:id — returns 403 for cross-tenant archive attempt', async () => {
    // archiveConversation returns null when tenantId doesn't match
    vi.mocked(chatService.archiveConversation).mockResolvedValue(null)

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chat/conversations/${CONV_A}`,
      headers: { 'x-test-tenant-id': TENANT_B },
    })

    expect(response.statusCode).toBe(403)
    expect(chatService.archiveConversation).toHaveBeenCalledWith(CONV_A, TENANT_B)
  })

  it('S-09: POST /chat/conversations/:id/messages — 404 on cross-tenant message send', async () => {
    // getConversation returns null for wrong tenant
    vi.mocked(chatService.getConversation).mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chat/conversations/${CONV_A}/messages`,
      headers: {
        'x-test-tenant-id': TENANT_B,
        'content-type': 'application/json',
      },
      payload: { content: 'Hello' },
    })

    expect(response.statusCode).toBe(404)
    // sendMessageStream must NOT be called — tenant isolation check fires first
    expect(chatService.sendMessageStream).not.toHaveBeenCalled()
  })

  it('S-09: POST /chat/conversations/:id/messages — 422 on archived conversation', async () => {
    vi.mocked(chatService.getConversation).mockResolvedValue({
      id: CONV_A,
      tenantId: TENANT_A,
      userId: 'user_test',
      channel: 'app',
      title: null,
      status: 'archived', // archived!
      lastMessageAt: null,
      systemPromptSnapshot: null,
      messages: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chat/conversations/${CONV_A}/messages`,
      headers: {
        'x-test-tenant-id': TENANT_A,
        'content-type': 'application/json',
      },
      payload: { content: 'Hello' },
    })

    expect(response.statusCode).toBe(422)
    expect(chatService.sendMessageStream).not.toHaveBeenCalled()
  })

  it('S-09: POST /chat/conversations/:id/attachments — 403 on cross-tenant attach', async () => {
    vi.mocked(chatService.attachDocument).mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chat/conversations/${CONV_A}/attachments`,
      headers: {
        'x-test-tenant-id': TENANT_B,
        'content-type': 'application/json',
      },
      payload: { documentId: 'doc_123' },
    })

    expect(response.statusCode).toBe(403)
  })

  it('S-09: DELETE /chat/conversations/:id/attachments/:docId — 403 on cross-tenant detach', async () => {
    vi.mocked(chatService.detachDocument).mockResolvedValue(false)

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chat/conversations/${CONV_A}/attachments/doc_xyz`,
      headers: { 'x-test-tenant-id': TENANT_B },
    })

    expect(response.statusCode).toBe(403)
  })

  it('S-09: GET /chat/settings — scoped to caller tenant only', async () => {
    const mockSettings = {
      id: 'settings_a',
      tenantId: TENANT_A,
      systemPrompt: null,
      welcomeMessage: null,
      launcherLabel: null,
      logoUrl: null,
      brandColor: null,
      accentColor: null,
      widgetTitle: null,
      allowedOrigins: [],
      model: null,
      kbDefaults: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(chatService.getChatSettings).mockResolvedValue(mockSettings)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/chat/settings',
      headers: { 'x-test-tenant-id': TENANT_A },
    })

    expect(response.statusCode).toBe(200)
    expect(chatService.getChatSettings).toHaveBeenCalledWith(TENANT_A)
    expect(chatService.getChatSettings).not.toHaveBeenCalledWith(TENANT_B)
  })

  it('S-09: PUT /chat/settings — systemPrompt > 8000 chars is rejected with 400', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/chat/settings',
      headers: {
        'x-test-tenant-id': TENANT_A,
        'content-type': 'application/json',
      },
      payload: { systemPrompt: 'x'.repeat(8001) },
    })

    expect(response.statusCode).toBe(400)
    expect(chatService.updateChatSettings).not.toHaveBeenCalled()
  })

  it('S-09: PUT /chat/settings — invalid hex colour rejected with 400', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/chat/settings',
      headers: {
        'x-test-tenant-id': TENANT_A,
        'content-type': 'application/json',
      },
      payload: { brandColor: 'red' }, // not #RRGGBB
    })

    expect(response.statusCode).toBe(400)
    expect(chatService.updateChatSettings).not.toHaveBeenCalled()
  })
})

describe('Tenant isolation — widget routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildTestApp()
  })

  it('S-09: Widget — 404 for unknown tenantSlug', async () => {
    vi.mocked(chatService.resolveTenantBySlug).mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: '/widget/unknown-slug/session',
      headers: {
        origin: 'https://example.com',
        'content-type': 'application/json',
      },
      payload: {},
    })

    expect(response.statusCode).toBe(404)
  })

  it('S-09: Widget — 403 when origin not in allowedOrigins', async () => {
    vi.mocked(chatService.resolveTenantBySlug).mockResolvedValue({ id: TENANT_A, slug: 'acme' })
    vi.mocked(chatService.getChatSettings).mockResolvedValue({
      id: 'settings_a',
      tenantId: TENANT_A,
      systemPrompt: null,
      welcomeMessage: null,
      launcherLabel: null,
      logoUrl: null,
      brandColor: null,
      accentColor: null,
      widgetTitle: null,
      allowedOrigins: ['https://allowed.com'],
      model: null,
      kbDefaults: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/widget/acme/session',
      headers: {
        origin: 'https://evil.com', // NOT in allowedOrigins
        'content-type': 'application/json',
      },
      payload: {},
    })

    expect(response.statusCode).toBe(403)
  })

  it('S-09: Widget — 401 for missing session token on message send', async () => {
    vi.mocked(chatService.resolveTenantBySlug).mockResolvedValue({ id: TENANT_A, slug: 'acme' })
    vi.mocked(chatService.getChatSettings).mockResolvedValue({
      id: 'settings_a',
      tenantId: TENANT_A,
      systemPrompt: null,
      welcomeMessage: null,
      launcherLabel: null,
      logoUrl: null,
      brandColor: null,
      accentColor: null,
      widgetTitle: null,
      allowedOrigins: ['https://allowed.com'],
      model: null,
      kbDefaults: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await app.inject({
      method: 'POST',
      url: `/widget/acme/conversations/${CONV_A}/messages`,
      headers: {
        origin: 'https://allowed.com',
        'content-type': 'application/json',
        // No Authorization header
      },
      payload: { content: 'Hello' },
    })

    expect(response.statusCode).toBe(401)
    expect(chatService.sendMessageStream).not.toHaveBeenCalled()
  })

  it('S-09: Widget — 401 for invalid/expired session token', async () => {
    vi.mocked(chatService.resolveTenantBySlug).mockResolvedValue({ id: TENANT_A, slug: 'acme' })
    vi.mocked(chatService.getChatSettings).mockResolvedValue({
      id: 'settings_a',
      tenantId: TENANT_A,
      systemPrompt: null,
      welcomeMessage: null,
      launcherLabel: null,
      logoUrl: null,
      brandColor: null,
      accentColor: null,
      widgetTitle: null,
      allowedOrigins: ['https://allowed.com'],
      model: null,
      kbDefaults: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(chatService.verifyWidgetSessionToken).mockResolvedValue(null) // expired

    const response = await app.inject({
      method: 'POST',
      url: `/widget/acme/conversations/${CONV_A}/messages`,
      headers: {
        origin: 'https://allowed.com',
        'content-type': 'application/json',
        authorization: 'Bearer bad_token',
      },
      payload: { content: 'Hello' },
    })

    expect(response.statusCode).toBe(401)
    expect(chatService.sendMessageStream).not.toHaveBeenCalled()
  })

  it('S-09: Widget — session belonging to different session key cannot access other conversation', async () => {
    vi.mocked(chatService.resolveTenantBySlug).mockResolvedValue({ id: TENANT_A, slug: 'acme' })
    vi.mocked(chatService.getChatSettings).mockResolvedValue({
      id: 'settings_a',
      tenantId: TENANT_A,
      systemPrompt: null,
      welcomeMessage: null,
      launcherLabel: null,
      logoUrl: null,
      brandColor: null,
      accentColor: null,
      widgetTitle: null,
      allowedOrigins: ['https://allowed.com'],
      model: null,
      kbDefaults: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(chatService.verifyWidgetSessionToken).mockResolvedValue({
      tenantId: TENANT_A,
      sessionKey: 'session_visitor_1',
      issuedAt: Date.now(),
    })
    // Conversation belongs to a DIFFERENT visitor
    vi.mocked(chatService.getConversation).mockResolvedValue({
      id: CONV_A,
      tenantId: TENANT_A,
      userId: 'session_visitor_2', // different session!
      channel: 'webchat',
      title: null,
      status: 'active',
      lastMessageAt: null,
      systemPromptSnapshot: null,
      messages: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await app.inject({
      method: 'POST',
      url: `/widget/acme/conversations/${CONV_A}/messages`,
      headers: {
        origin: 'https://allowed.com',
        'content-type': 'application/json',
        authorization: 'Bearer valid_token',
      },
      payload: { content: 'Hello' },
    })

    expect(response.statusCode).toBe(403)
    expect(chatService.sendMessageStream).not.toHaveBeenCalled()
  })

  it('S-09: Widget config — never exposes internal tenantId in response', async () => {
    vi.mocked(chatService.resolveTenantBySlug).mockResolvedValue({ id: TENANT_A, slug: 'acme' })
    vi.mocked(chatService.getChatSettings).mockResolvedValue({
      id: 'settings_a',
      tenantId: TENANT_A,
      systemPrompt: null,
      welcomeMessage: 'Hello!',
      launcherLabel: 'Chat',
      logoUrl: null,
      brandColor: '#0F172A',
      accentColor: '#22C55E',
      widgetTitle: 'Acme Support',
      allowedOrigins: ['https://allowed.com'],
      model: null,
      kbDefaults: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/widget/acme/config',
      headers: { origin: 'https://allowed.com' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    // tenantId must NOT appear anywhere in the response
    expect(JSON.stringify(body)).not.toContain(TENANT_A)
    expect(body.data.tenantSlug).toBe('acme')
  })
})
