/**
 * SessionTokenService — Sprint 3 (F-08).
 *
 * HMAC-SHA256 signed session tokens for WebChat widget guests.
 * No DB lookup on verification — MAC is recomputed and compared.
 *
 * Token payload: { tenantId, sessionKey, issuedAt }
 * TTL: 24h (hard rejection of expired tokens)
 *
 * Security notes (from sprint brief):
 * - tenantId is NEVER exposed in widget API responses or URLs (use tenantSlug only)
 * - sessionKey is a random UUID stored in browser sessionStorage
 * - Token is short-lived (24h) and non-refreshable from client
 */
import { createHmac, timingSafeEqual } from 'crypto'

export interface SessionTokenPayload {
  /** Internal tenant UUID — NOT exposed in widget API responses */
  tenantId: string
  /** Random UUID assigned per browser session, stored in sessionStorage */
  sessionKey: string
  /** Unix timestamp (ms) */
  issuedAt: number
}

const TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Sign a session token payload.
 *
 * @param payload  Token payload
 * @param secret   Per-tenant HMAC secret (min 32 chars recommended)
 * @returns        base64url-encoded token string
 */
export function signToken(payload: SessionTokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export interface VerifyResult {
  valid: boolean
  payload?: SessionTokenPayload
  reason?: string
}

/**
 * Verify a session token.
 * Recomputes the MAC and rejects expired tokens.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param token   Token string from client
 * @param secret  Per-tenant HMAC secret
 */
export function verifyToken(token: string, secret: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token' }
  }

  const [body, clientSig] = parts as [string, string]

  // Recompute expected signature
  const expectedSig = createHmac('sha256', secret).update(body).digest('base64url')

  // Timing-safe comparison
  const clientSigBuf = Buffer.from(clientSig, 'base64url')
  const expectedSigBuf = Buffer.from(expectedSig, 'base64url')

  if (
    clientSigBuf.length !== expectedSigBuf.length ||
    !timingSafeEqual(clientSigBuf, expectedSigBuf)
  ) {
    return { valid: false, reason: 'Invalid signature' }
  }

  // Decode and validate payload
  let payload: SessionTokenPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionTokenPayload
  } catch {
    return { valid: false, reason: 'Invalid token payload' }
  }

  // Check TTL
  if (Date.now() - payload.issuedAt > TTL_MS) {
    return { valid: false, reason: 'Token expired' }
  }

  return { valid: true, payload }
}
