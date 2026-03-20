/**
 * Translation middleware -- Sprint 4 S-02.
 *
 * Reads Accept-Language header + tenant settings.
 * Sets request.userLanguage for downstream handlers.
 *
 * Rule 3: must run AFTER authenticate (requires request.auth.tenantId).
 * Rule 4: TypeScript strict, no any.
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import { getChatSettings } from '../services/chat'

// -- FastifyRequest augmentation -----------------------------------------------

declare module 'fastify' {
  interface FastifyRequest {
    userLanguage: string
  }
}

// -- Helpers -------------------------------------------------------------------

/**
 * Parse Accept-Language header, return the best matching ISO 639-1 two-letter code.
 * e.g. "de,en-US;q=0.9,en;q=0.8" returns "de"
 * Falls back to "en" if nothing parseable is found.
 */
function parseAcceptLanguage(header: string | undefined): string {
  if (!header) return 'en'
  const parts = header.split(',')
  for (const part of parts) {
    const tag = part.trim().split(';')[0]?.trim() ?? ''
    const code = tag.slice(0, 2).toLowerCase()
    if (/^[a-z]{2}$/.test(code)) return code
  }
  return 'en'
}

// -- Middleware ----------------------------------------------------------------

/**
 * translateMiddleware preHandler.
 *
 * Resolves the user's preferred language from Accept-Language header and
 * tenant-configured supportedLanguages / defaultLanguage. Sets
 * request.userLanguage so downstream route handlers can use it.
 *
 * When translation is disabled for the tenant, userLanguage is set to the
 * tenant's defaultLanguage (typically "en") -- downstream handlers should
 * skip translation when userLanguage === "en" or when translation is off.
 *
 * Usage:
 *   fastify.post('/route', { preHandler: [authenticate, translateMiddleware] }, handler)
 */
export async function translateMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const tenantId = request.auth?.tenantId
  if (!tenantId) {
    request.userLanguage = 'en'
    return
  }

  const settings = await getChatSettings(tenantId)

  // If translation is disabled, use the tenant default (usually "en")
  if (!settings.translationEnabled) {
    request.userLanguage = (settings.defaultLanguage as string | null) ?? 'en'
    return
  }

  const headerLang = parseAcceptLanguage(request.headers['accept-language'])
  const supported: string[] = (settings.supportedLanguages as string[] | null) ?? [
    'en',
    'de',
    'fr',
    'cs',
    'pl',
  ]

  // Use header language if supported by the tenant, otherwise fall back to default
  if (supported.includes(headerLang)) {
    request.userLanguage = headerLang
  } else {
    request.userLanguage = (settings.defaultLanguage as string | null) ?? 'en'
  }
}
