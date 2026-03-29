/**
 * Prompt locale API routes — Sprint 4c.
 *
 * POST /api/v1/tenant/prompts/translate/:locale — batch-translate all prompts for tenant
 * GET  /api/v1/tenant/prompts/locale/:locale    — retrieve cached prompt translations
 *
 * Architecture:
 * - translatePrompts() from @wren/llm — single LLM call for all prompts.
 * - Upsert to TenantPromptLocale — idempotent (skips non-stale rows).
 * - GET is public with ?tenantSlug (mirrors locale GET pattern).
 * - POST is protected; tenantId from request.auth.tenantId.
 *
 * Sprint 4c: F-02
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@wren/db'
import { getTranslationService } from '@wren/llm'
import { authenticate } from '../plugins/auth'
import { isSupported } from '../lib/i18n-support'

export async function promptLocaleRoutes(fastify: FastifyInstance): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/v1/tenant/prompts/translate/:locale
  // Translates ALL prompts for tenant in a single LLM call. Idempotent.
  // Protected: requires valid Clerk session.
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post<{ Params: { locale: string } }>(
    '/translate/:locale',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { locale: string } }>, reply: FastifyReply) => {
      const { locale } = request.params
      const tenantId = request.auth.tenantId

      if (!isSupported(locale)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Locale '${locale}' is not supported.`,
        })
      }

      if (locale === 'en') {
        return reply.status(200).send({ message: 'English is the source language — no translation needed.', locale: 'en' })
      }

      // Fetch all public prompts (global prompt library)
      const allPrompts = await db.prompt.findMany({
        where: { isPublic: true },
        select: { id: true, title: true, description: true },
      })

      if (allPrompts.length === 0) {
        return reply.status(200).send({ translated: 0, locale })
      }

      // Find which prompts already have a non-stale translation for this tenant+locale
      const existing = await db.tenantPromptLocale.findMany({
        where: { tenantId, locale, stale: false },
        select: { promptId: true },
      })
      const alreadyTranslated = new Set(existing.map((r) => r.promptId))

      // Build array of prompts that need translating (new or stale)
      const toTranslate = allPrompts.filter((p) => !alreadyTranslated.has(p.id))

      if (toTranslate.length === 0) {
        return reply.status(200).send({ translated: 0, skipped: alreadyTranslated.size, locale, cached: true })
      }

      // Single LLM call for all prompts that need translation
      const svc = getTranslationService()
      let translated: Record<string, { title: string; description: string }>

      try {
        translated = await svc.translatePrompts(toTranslate, locale)
      } catch (err) {
        fastify.log.error({ err, locale, tenantId }, '[F-02] translatePrompts failed')
        return reply.status(503).send({ error: 'Service Unavailable', message: 'Translation service temporarily unavailable.' })
      }

      // Upsert translated rows
      const upserts = toTranslate.map((p) => {
        const t = translated[p.id]
        if (!t) return Promise.resolve()
        return db.tenantPromptLocale.upsert({
          where: { tenantId_promptId_locale: { tenantId, promptId: p.id, locale } },
          create: { tenantId, promptId: p.id, locale, title: t.title, description: t.description || null, stale: false },
          update: { title: t.title, description: t.description || null, stale: false, generatedAt: new Date() },
        })
      })

      await Promise.all(upserts)

      return reply.status(200).send({
        translated: toTranslate.length,
        skipped: alreadyTranslated.size,
        locale,
      })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tenant/prompts/locale/:locale
  // Returns translated prompt map for tenant. 404 if not generated.
  //
  // Public endpoint — tenantId resolved from ?tenantSlug query param.
  // Returns: { [promptId]: { title, description } }
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get<{ Params: { locale: string }; Querystring: { tenantSlug?: string } }>(
    '/locale/:locale',
    async (
      request: FastifyRequest<{ Params: { locale: string }; Querystring: { tenantSlug?: string } }>,
      reply: FastifyReply
    ) => {
      const { locale } = request.params

      // English — no translations stored, caller should use English fallback
      if (locale === 'en') {
        return reply.status(200).send({ data: {}, locale: 'en' })
      }

      // Resolve tenantId from tenantSlug (public path)
      const tenantSlug = request.query.tenantSlug ?? ''
      let tenantId = ''

      if (tenantSlug) {
        const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } })
        tenantId = tenant?.id ?? ''
      }

      if (!tenantId) {
        tenantId = (request as any).auth?.tenantId ?? ''
      }

      if (!tenantId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'tenantSlug query param is required.' })
      }

      const rows = await db.tenantPromptLocale.findMany({
        where: { tenantId, locale },
        select: { promptId: true, title: true, description: true, stale: true },
      })

      if (rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Prompt translations for locale '${locale}' have not been generated for this tenant.`,
        })
      }

      // Check if any rows are stale — if so, fire-and-forget re-translation (F-05)
      const staleCount = rows.filter((r) => r.stale).length
      if (staleCount > 0) {
        fastify.log.info({ tenantId, locale, staleCount }, '[F-05] Stale prompt translations found — triggering background re-translation')
        // Fire-and-forget: do not await
        triggerPromptReTranslation(tenantId, locale).catch((err) =>
          fastify.log.warn({ err }, '[F-05] Background re-translation failed')
        )
      }

      // Return current data (even if stale — best-effort)
      const data: Record<string, { title: string; description: string | null }> = {}
      for (const row of rows) {
        data[row.promptId] = { title: row.title, description: row.description }
      }

      return reply.status(200).send({ data, locale, staleCount })
    }
  )
}

/**
 * Fire-and-forget re-translation for stale prompt translations.
 * Called when stale rows detected on GET.
 */
async function triggerPromptReTranslation(tenantId: string, locale: string): Promise<void> {
  const allPrompts = await db.prompt.findMany({
    where: { isPublic: true },
    select: { id: true, title: true, description: true },
  })

  const staleRows = await db.tenantPromptLocale.findMany({
    where: { tenantId, locale, stale: true },
    select: { promptId: true },
  })
  const staleIds = new Set(staleRows.map((r) => r.promptId))

  const toTranslate = allPrompts.filter((p) => staleIds.has(p.id))

  if (toTranslate.length === 0) return

  const svc = getTranslationService()
  const translated = await svc.translatePrompts(toTranslate, locale)

  const upserts = toTranslate.map((p) => {
    const t = translated[p.id]
    if (!t) return Promise.resolve()
    return db.tenantPromptLocale.upsert({
      where: { tenantId_promptId_locale: { tenantId, promptId: p.id, locale } },
      create: { tenantId, promptId: p.id, locale, title: t.title, description: t.description || null, stale: false },
      update: { title: t.title, description: t.description || null, stale: false, generatedAt: new Date() },
    })
  })

  await Promise.all(upserts)
}
