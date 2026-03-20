/**
 * Rex acceptance tests — Sprint 2: Knowledge Base happy paths.
 *
 * Covers:
 * - S2-01: GET /api/v1/kb/ — get KB root (tenant KB info)
 * - S2-02: GET /api/v1/kb/documents — list KB documents
 * - S2-03: GET /api/v1/kb/documents/:id — get single document
 * - S2-04: PATCH /api/v1/kb/documents/:id — update document metadata
 * - S2-05: GET /api/v1/kb/collections — list collections
 * - S2-06: POST /api/v1/kb/collections — create collection
 * - S2-07: PATCH /api/v1/kb/collections/:id — rename collection
 * - S2-08: DELETE /api/v1/kb/collections/:id — delete collection
 * - S2-09: GET /api/v1/kb/search?q=... — keyword search
 *
 * Auth: dev/lab fallback to demo tenant (no token needed).
 * Base URL: http://localhost:3001
 * Run: pnpm test:e2e
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3001'

// ── Sprint 2: Knowledge Base ──────────────────────────────────────────────────

test('S2-01: GET /api/v1/kb/ returns KB root for demo tenant', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/kb/`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data).toMatchObject({
    id: expect.any(String),
    tenantId: expect.any(String),
    name: expect.any(String),
  })
})

test('S2-02: GET /api/v1/kb/documents returns document list', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/kb/documents`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
})

test('S2-03: GET /api/v1/kb/documents/:id returns single document', async ({ request }) => {
  // List first to get a real ID
  const listRes = await request.get(`${BASE}/api/v1/kb/documents`)
  expect(listRes.status()).toBe(200)
  const listBody = await listRes.json()

  // Skip if no documents exist
  if (listBody.data.length === 0) {
    test.skip()
    return
  }

  const docId: string = listBody.data[0].id
  const res = await request.get(`${BASE}/api/v1/kb/documents/${docId}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.id).toBe(docId)
  expect(body.data.title).toBeTruthy()
  expect(body.data.status).toMatch(/^(ready|processing|error)$/)
})

test('S2-04: PATCH /api/v1/kb/documents/:id updates document title', async ({ request }) => {
  const listRes = await request.get(`${BASE}/api/v1/kb/documents`)
  expect(listRes.status()).toBe(200)
  const listBody = await listRes.json()

  if (listBody.data.length === 0) {
    test.skip()
    return
  }

  const docId: string = listBody.data[0].id
  const newTitle = `Rex Test Title ${Date.now()}`

  const res = await request.patch(`${BASE}/api/v1/kb/documents/${docId}`, {
    data: JSON.stringify({ title: newTitle }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.title).toBe(newTitle)

  // Restore original title
  await request.patch(`${BASE}/api/v1/kb/documents/${docId}`, {
    data: JSON.stringify({ title: listBody.data[0].title }),
    headers: { 'Content-Type': 'application/json' },
  })
})

test('S2-05: GET /api/v1/kb/collections returns collection list', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/kb/collections`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
})

test('S2-06: POST /api/v1/kb/collections creates a collection', async ({ request }) => {
  const collectionName = `Rex Collection ${Date.now()}`

  const res = await request.post(`${BASE}/api/v1/kb/collections`, {
    data: JSON.stringify({ name: collectionName }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(body.data.name).toBe(collectionName)
  expect(body.data.id).toBeTruthy()

  // Store ID for cleanup
  const createdId: string = body.data.id

  // S2-07: PATCH rename
  const renamedName = `${collectionName} Renamed`
  const patchRes = await request.patch(`${BASE}/api/v1/kb/collections/${createdId}`, {
    data: JSON.stringify({ name: renamedName }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(patchRes.status()).toBe(200)
  const patchBody = await patchRes.json()
  expect(patchBody.data.name).toBe(renamedName)

  // S2-08: DELETE cleanup
  const deleteRes = await request.delete(`${BASE}/api/v1/kb/collections/${createdId}`)
  expect(deleteRes.status()).toBe(200)
})

test('S2-09: GET /api/v1/kb/search?q= returns results', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/kb/search?q=AI`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body.data)).toBe(true)
})

test('S2-10: GET /api/v1/kb/documents/:id/status returns processing status', async ({ request }) => {
  const listRes = await request.get(`${BASE}/api/v1/kb/documents`)
  const listBody = await listRes.json()

  if (listBody.data.length === 0) {
    test.skip()
    return
  }

  const docId: string = listBody.data[0].id
  const res = await request.get(`${BASE}/api/v1/kb/documents/${docId}/status`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.id).toBe(docId)
  expect(body.data.status).toMatch(/^(ready|processing|error)$/)
})
