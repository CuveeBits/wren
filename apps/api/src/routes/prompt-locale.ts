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
        select: { id: true, title: true, description: true, formSchema: true },
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

      // Translate sequentially — one prompt at a time to handle slow local models without timeout
      const svc = getTranslationService()
      let translatedCount = 0

      for (const p of toTranslate) {
        try {
          const result = await svc.translatePrompts([p], locale)
          const t = result[p.id]
          if (!t) continue
          await db.tenantPromptLocale.upsert({
            where: { tenantId_promptId_locale: { tenantId, promptId: p.id, locale } },
            create: { tenantId, promptId: p.id, locale, title: t.title, description: t.description || null, formSchemaTranslated: t.formSchemaTranslated ?? undefined, stale: false },
            update: { title: t.title, description: t.description || null, formSchemaTranslated: t.formSchemaTranslated ?? undefined, stale: false, generatedAt: new Date() },
          })
          translatedCount++
        } catch (err) {
          fastify.log.error({ err, locale, tenantId, promptId: p.id }, '[F-02] translatePrompts failed for prompt — skipping')
        }
      }

      return reply.status(200).send({
        translated: translatedCount,
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
        select: { promptId: true, title: true, description: true, formSchemaTranslated: true, stale: true },
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
      const data: Record<string, { title: string; description: string | null; formSchemaTranslated: unknown | null }> = {}
      for (const row of rows) {
        data[row.promptId] = { title: row.title, description: row.description, formSchemaTranslated: row.formSchemaTranslated ?? null }
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
    select: { id: true, title: true, description: true, formSchema: true },
  })

  const staleRows = await db.tenantPromptLocale.findMany({
    where: { tenantId, locale, stale: true },
    select: { promptId: true },
  })
  const staleIds = new Set(staleRows.map((r) => r.promptId))

  const toTranslate = allPrompts.filter((p) => staleIds.has(p.id))

  if (toTranslate.length === 0) return

  const svc = getTranslationService()

  // Sequential — one prompt at a time so slow local models don't time out
  for (const p of toTranslate) {
    try {
      const result = await svc.translatePrompts([p], locale)
      const t = result[p.id]
      if (!t) continue
      await db.tenantPromptLocale.upsert({
        where: { tenantId_promptId_locale: { tenantId, promptId: p.id, locale } },
        create: { tenantId, promptId: p.id, locale, title: t.title, description: t.description || null, formSchemaTranslated: t.formSchemaTranslated ?? undefined, stale: false },
        update: { title: t.title, description: t.description || null, formSchemaTranslated: t.formSchemaTranslated ?? undefined, stale: false, generatedAt: new Date() },
      })
    } catch (err) {
      console.warn(`[F-05] Re-translation failed for prompt ${p.id} (${locale}):`, err)
      // Continue with next prompt — don't abort the whole batch
    }
  }
}
