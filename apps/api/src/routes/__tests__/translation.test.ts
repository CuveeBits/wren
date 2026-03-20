/**
 * Translation route tests -- Sprint 4 S-04.
 *
 * Tests:
 * - POST /translate/detect: German text returns 'de'
 * - POST /translate: DE to EN returns English text
 * - POST /translate: EN to EN passthrough (no translation needed)
 * - POST /translate: missing toLang returns 400
 * - POST /translate/detect: empty text returns 400
 *
 * LiteLLM is mocked -- no actual LLM calls in unit tests.
 * Auth is mocked -- x-test-tenant-id header pattern (same as tenant-isolation.test.ts).
 *
 * Run: pnpm --filter @wren/api test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { translationRoutes } from '../translation'

// -- Mock @wren/llm ------------------------------------------------------------

vi.mock('../../config', () => ({
  config: {
    litellmBaseUrl: 'http://localhost:4000',
    litellmApiKey: 'sk-test',
    port: 3001,
    nodeEnv: 'test',
    databaseUrl: 'postgresql://test',
    redisUrl: 'redis://localhost:6379',
    clerkPublishableKey: 'pk_test',
    clerkSecretKey: 'sk_test',
  },
}))

vi.mock('@wren/llm', () => ({
  detectLanguage: vi.fn(),
  translate: vi.fn(),
}))

// -- Mock auth plugin ----------------------------------------------------------

vi.mock('../../plugins/auth', () => ({
  authenticate: vi.fn(async (request: any, _reply: any) => {
    const tenantId = request.headers['x-test-tenant-id'] as string
    if (!tenantId) {
      throw new Error('Test: x-test-tenant-id header required')
    }
    request.auth = {
      tenantId,
      clerkUserId: 'user_test',
      clerkOrgId: 'org_test',
      role: 'USER',
    }
  }),
}))

import * as llm from '@wren/llm'

// -- Test app builder ----------------------------------------------------------

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  await app.register(
    async (v1) => {
      await v1.register(translationRoutes, { prefix: '/translate' })
    },
    { prefix: '/api/v1' }
  )
  await app.ready()
  return app
}

// -- Tests ---------------------------------------------------------------------

const TENANT = 'tenant_test_001'

describe('POST /api/v1/translate/detect', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
  })

  it('S-04: detects German text as de', async () => {
    vi.mocked(llm.detectLanguage).mockResolvedValue('de')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate/detect',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: { text: 'Guten Morgen, wie geht es Ihnen?' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.data.language).toBe('de')
    expect(llm.detectLanguage).toHaveBeenCalledOnce()
  })

  it('S-04: returns 400 for empty text', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate/detect',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: { text: '' },
    })

    expect(response.statusCode).toBe(400)
    expect(llm.detectLanguage).not.toHaveBeenCalled()
  })

  it('S-04: returns 400 for missing text field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate/detect',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(llm.detectLanguage).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/translate', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
  })

  it('S-04: translates DE to EN correctly', async () => {
    vi.mocked(llm.translate).mockResolvedValue('Good morning, how are you?')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: {
        text: 'Guten Morgen, wie geht es Ihnen?',
        fromLang: 'de',
        toLang: 'en',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.data.translated).toBe('Good morning, how are you?')
    expect(body.data.fromLang).toBe('de')
    expect(body.data.toLang).toBe('en')
    expect(llm.translate).toHaveBeenCalledWith(
      'Guten Morgen, wie geht es Ihnen?',
      'de',
      'en',
      expect.objectContaining({ litellmBaseUrl: expect.any(String) })
    )
  })

  it('S-04: EN to EN passthrough -- translate returns original text unchanged', async () => {
    vi.mocked(llm.translate).mockResolvedValue('Hello, how are you?')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: {
        text: 'Hello, how are you?',
        fromLang: 'en',
        toLang: 'en',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.data.translated).toBe('Hello, how are you?')
    expect(body.data.fromLang).toBe('en')
    expect(body.data.toLang).toBe('en')
  })

  it('S-04: auto-detects fromLang when not provided', async () => {
    vi.mocked(llm.detectLanguage).mockResolvedValue('fr')
    vi.mocked(llm.translate).mockResolvedValue('Hello world')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: {
        text: 'Bonjour le monde',
        toLang: 'en',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.data.fromLang).toBe('fr')
    expect(llm.detectLanguage).toHaveBeenCalledOnce()
    expect(llm.translate).toHaveBeenCalledWith(
      'Bonjour le monde',
      'fr',
      'en',
      expect.any(Object)
    )
  })

  it('S-04: returns 400 when toLang is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: {
        text: 'Guten Morgen',
        fromLang: 'de',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(llm.translate).not.toHaveBeenCalled()
  })

  it('S-04: returns 400 when toLang is not a valid ISO 639-1 code', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: {
        text: 'Hello',
        fromLang: 'en',
        toLang: 'english',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(llm.translate).not.toHaveBeenCalled()
  })

  it('S-04: returns 400 for empty text', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/translate',
      headers: {
        'x-test-tenant-id': TENANT,
        'content-type': 'application/json',
      },
      payload: { text: '', toLang: 'en' },
    })

    expect(response.statusCode).toBe(400)
    expect(llm.translate).not.toHaveBeenCalled()
  })
})
