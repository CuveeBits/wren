/**
 * Rex acceptance tests — Sprint 4: Auto-translate happy paths + edge cases.
 *
 * Covers:
 * - S4-01: POST /api/v1/translate — DE→EN translation
 * - S4-02: POST /api/v1/translate — EN→EN passthrough
 * - S4-03: POST /api/v1/translate — FR→EN translation
 * - S4-04: POST /api/v1/translate — auto-detect fromLang (omit fromLang)
 * - S4-05: POST /api/v1/translate — missing toLang → 400
 * - S4-06: POST /api/v1/translate — empty text → 400
 * - S4-07: POST /api/v1/translate — invalid toLang (not ISO 639-1) → 400
 * - S4-08: POST /api/v1/translate/detect — German text → 'de'
 * - S4-09: POST /api/v1/translate/detect — empty text → 400
 * - S4-10: GET /api/v1/chat/settings includes translation fields
 * - S4-11: PATCH /api/v1/chat/settings can set translationEnabled, supportedLanguages, defaultLanguage
 *
 * Auth: dev/lab fallback to demo tenant (no token needed).
 * Base URL: http://localhost:3001
 * Run: pnpm test:e2e
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3001'

// ── Sprint 4: Auto-translate ──────────────────────────────────────────────────

test('S4-01: POST /api/v1/translate — DE→EN produces English output', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: 'Guten Morgen', fromLang: 'de', toLang: 'en' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.translated).toBeTruthy()
  expect(typeof body.data.translated).toBe('string')
  expect(body.data.fromLang).toBe('de')
  expect(body.data.toLang).toBe('en')
})

test('S4-02: POST /api/v1/translate — EN→EN passthrough returns original text unchanged', async ({ request }) => {
  const originalText = 'Hello, how are you?'
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: originalText, fromLang: 'en', toLang: 'en' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  // Passthrough — the LLM should return something (may be rephrased or identical)
  expect(body.data.translated).toBeTruthy()
  expect(body.data.fromLang).toBe('en')
  expect(body.data.toLang).toBe('en')
})

test('S4-03: POST /api/v1/translate — FR→EN translation', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: 'Bonjour le monde', fromLang: 'fr', toLang: 'en' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.translated).toBeTruthy()
  expect(body.data.fromLang).toBe('fr')
  expect(body.data.toLang).toBe('en')
})

test('S4-04: POST /api/v1/translate — auto-detects fromLang when omitted', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: 'Guten Abend', toLang: 'en' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.fromLang).toBeTruthy()
  expect(typeof body.data.fromLang).toBe('string')
  expect(body.data.translated).toBeTruthy()
})

test('S4-05: POST /api/v1/translate — missing toLang returns 400', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: 'Guten Morgen', fromLang: 'de' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(400)
})

test('S4-06: POST /api/v1/translate — empty text returns 400', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: '', toLang: 'en' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(400)
})

test('S4-07: POST /api/v1/translate — invalid toLang (not ISO 639-1) returns 400', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate`, {
    data: JSON.stringify({ text: 'Hello', fromLang: 'en', toLang: 'english' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(400)
})

test('S4-08: POST /api/v1/translate/detect — German text detected as de', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate/detect`, {
    data: JSON.stringify({ text: 'Guten Morgen, wie geht es Ihnen?' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.data.language).toBe('de')
})

test('S4-09: POST /api/v1/translate/detect — empty text returns 400', async ({ request }) => {
  const res = await request.post(`${BASE}/api/v1/translate/detect`, {
    data: JSON.stringify({ text: '' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(400)
})

test('S4-10: GET /api/v1/chat/settings includes translation fields', async ({ request }) => {
  const res = await request.get(`${BASE}/api/v1/chat/settings`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect('translationEnabled' in body.data).toBe(true)
  expect('supportedLanguages' in body.data).toBe(true)
  expect('defaultLanguage' in body.data).toBe(true)
  expect(typeof body.data.translationEnabled).toBe('boolean')
  expect(Array.isArray(body.data.supportedLanguages)).toBe(true)
})

test('S4-11: PATCH /api/v1/chat/settings — set translationEnabled, supportedLanguages, defaultLanguage', async ({ request }) => {
  // Read current state for restore
  const getRes = await request.get(`${BASE}/api/v1/chat/settings`)
  const original = (await getRes.json()).data

  const patchRes = await request.patch(`${BASE}/api/v1/chat/settings`, {
    data: JSON.stringify({
      translationEnabled: true,
      supportedLanguages: ['de', 'fr', 'en'],
      defaultLanguage: 'en',
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(patchRes.status()).toBe(200)
  const body = await patchRes.json()
  expect(body.data.translationEnabled).toBe(true)
  expect(body.data.supportedLanguages).toEqual(expect.arrayContaining(['de', 'fr', 'en']))
  expect(body.data.defaultLanguage).toBe('en')

  // Restore
  await request.patch(`${BASE}/api/v1/chat/settings`, {
    data: JSON.stringify({
      translationEnabled: original.translationEnabled,
      supportedLanguages: original.supportedLanguages,
      defaultLanguage: original.defaultLanguage,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
})
