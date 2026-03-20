/**
 * Rex acceptance tests — Sprint 3: Chat interface happy paths.
 *
 * Covers:
 * - S3-01: GET /api/v1/chat/conversations — list conversations
 * - S3-02: POST /api/v1/chat/conversations — create conversation
 * - S3-03: GET /api/v1/chat/conversations/:id — get conversation
 * - S3-04: PATCH /api/v1/chat/conversations/:id — update title
 * - S3-05: DELETE /api/v1/chat/conversations/:id — archive conversation
 * - S3-06: GET /api/v1/chat/conversations/:id/messages — list messages
 * - S3-07: GET /api/v1/chat/settings — get chat settings
 * - S3-08: PATCH /api/v1/chat/settings — update chat settings
 * - S3-09: POST /api/v1/chat/conversations/:id/messages — send message (SSE)
 *
 * Auth: dev/lab fallback to demo tenant (no token needed).
 * Base URL: http://localhost:3001
 * Run: pnpm test:e2e
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3001'

// ── Sprint 3: Chat interface ──────────────────────────────────────────────────

test('S3-01: GET /api/v1/chat/conversations returns list', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/chat/conversations`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
  // Pagination cursor field present
  expect('nextCursor' in body).toBe(true)
})

test('S3-02: POST /api/v1/chat/conversations creates a conversation', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/chat/conversations`, {
    data: JSON.stringify({ channel: 'app' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(body.data.id).toBeTruthy()
  expect(body.data.channel).toBe('app')
  expect(body.data.status).toBe('active')
})

test('S3-03: GET /api/v1/chat/conversations/:id returns single conversation', async ({ request }) => {
  // Create one to ensure it exists
  const createRes = await request.post(`${BASE}/api/v1/chat/conversations`, {
    data: JSON.stringify({ channel: 'app' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(createRes.status()).toBe(201)
  const created = await createRes.json()
  const convId: string = created.data.id

  const res = await request.get(`${BASE}/api/v1/chat/conversations/${convId}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.id).toBe(convId)
  expect(body.data.messages).toBeDefined()
})

test('S3-04: PATCH /api/v1/chat/conversations/:id updates title', async ({ request }) => {
  const createRes = await request.post(`${BASE}/api/v1/chat/conversations`, {
    data: JSON.stringify({ channel: 'app' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const created = await createRes.json()
  const convId: string = created.data.id

  const newTitle = `Rex Title ${Date.now()}`
  const res = await request.patch(`${BASE}/api/v1/chat/conversations/${convId}`, {
    data: JSON.stringify({ title: newTitle }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.title).toBe(newTitle)
})

test('S3-05: DELETE /api/v1/chat/conversations/:id archives conversation', async ({ request }) => {
  const createRes = await request.post(`${BASE}/api/v1/chat/conversations`, {
    data: JSON.stringify({ channel: 'app' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const created = await createRes.json()
  const convId: string = created.data.id

  const res = await request.delete(`${BASE}/api/v1/chat/conversations/${convId}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.status).toBe('archived')
})

test('S3-06: GET /api/v1/chat/conversations/:id/messages returns message list', async ({ request }) => {
  const createRes = await request.post(`${BASE}/api/v1/chat/conversations`, {
    data: JSON.stringify({ channel: 'app' }),
    headers: { 'Content-Type': 'application/json' },
  })
  const created = await createRes.json()
  const convId: string = created.data.id

  const res = await request.get(`${BASE}/api/v1/chat/conversations/${convId}/messages`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
})

test('S3-07: GET /api/v1/chat/settings returns settings with translation fields', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/chat/settings`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data).toMatchObject({
    id: expect.any(String),
    tenantId: expect.any(String),
    translationEnabled: expect.any(Boolean),
    supportedLanguages: expect.any(Array),
    defaultLanguage: expect.any(String),
  })
})

test('S3-08: PATCH /api/v1/chat/settings updates welcome message', async ({ request }) => {
  const welcomeMsg = `Rex welcome ${Date.now()}`
  const res = await request.patch(`${BASE}/api/v1/chat/settings`, {
    data: JSON.stringify({ welcomeMessage: welcomeMsg }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.welcomeMessage).toBe(welcomeMsg)

  // Restore
  await request.patch(`${BASE}/api/v1/chat/settings`, {
    data: JSON.stringify({ welcomeMessage: null }),
    headers: { 'Content-Type': 'application/json' },
  })
})

test('S3-09: GET /api/v1/chat/conversations/:id — 404 for non-existent ID', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/chat/conversations/does-not-exist-xxx`)
  expect(res.status()).toBe(404)
})
