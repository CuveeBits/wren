/**
 * Rex acceptance tests — Sprint 1: Prompt Library happy paths.
 *
 * Covers:
 * - S1-01: Health check returns ok
 * - S1-02: GET /api/v1/prompts  — list prompts (public, paginated)
 * - S1-03: GET /api/v1/prompts/:id — get single prompt by ID
 * - S1-04: GET /api/v1/prompts/meta/depts — distinct departments
 * - S1-05: GET /api/v1/prompts/meta/cats  — distinct categories
 * - S1-06: GET /api/v1/prompts — department filter returns only matching items
 *
 * No auth token required — protected routes fall through to demo tenant in
 * dev/lab mode (see apps/api/src/plugins/auth.ts).
 *
 * Base URL: http://localhost:3001
 * Run: pnpm test:e2e
 */
import { test, expect } from '@playwright/test'

// ── helpers ──────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:3001'

// ── Sprint 1: Prompt Library ──────────────────────────────────────────────────

test('S1-01: health check returns database:ok and redis:ok', async ({ request }) => {
  const res = await request.get(`${BASE}/health`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.services.database).toBe('ok')
  expect(body.services.redis).toBe('ok')
})

test('S1-02: GET /api/v1/prompts returns paginated list', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/prompts`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
  expect(body.data.length).toBeGreaterThan(0)
  expect(body.meta).toMatchObject({
    total: expect.any(Number),
    page: 1,
    limit: expect.any(Number),
  })
})

test('S1-03: GET /api/v1/prompts/:id returns single prompt with formSchema', async ({ request }) => {
  // First fetch the list to get a real ID
  const listRes = await request.get(`${BASE}/api/v1/prompts`)
  expect(listRes.status()).toBe(200)
  const listBody = await listRes.json()
  const firstId: string = listBody.data[0].id

  const res = await request.get(`${BASE}/api/v1/prompts/${firstId}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.id).toBe(firstId)
  expect(body.data.title).toBeTruthy()
  // formSchema is present (may be null for prompts with no variables)
  expect('formSchema' in body.data).toBe(true)
})

test('S1-04: GET /api/v1/prompts/meta/depts returns distinct departments', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/prompts/meta/depts`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
  expect(body.data.length).toBeGreaterThan(0)
  // Each entry should be a non-empty string
  for (const dept of body.data) {
    expect(typeof dept).toBe('string')
    expect(dept.length).toBeGreaterThan(0)
  }
})

test('S1-05: GET /api/v1/prompts/meta/cats returns distinct categories', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/prompts/meta/cats`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
  expect(body.data.length).toBeGreaterThan(0)
})

test('S1-06: GET /api/v1/prompts?department=sales filters results', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/prompts?department=sales`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
  // All returned prompts must be in the sales department
  for (const prompt of body.data) {
    expect(prompt.department).toBe('sales')
  }
})

test('S1-07: GET /api/v1/prompts/:id with invalid ID returns 404', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/prompts/does-not-exist-xxx`)
  expect(res.status()).toBe(404)
})
