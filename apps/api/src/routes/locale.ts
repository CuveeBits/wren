/**
 * Tenant locale API routes — Sprint 4b.
 *
 * POST /api/v1/tenant/locale/generate   — F-04: generate translations for a locale
 * GET  /api/v1/tenant/locale/:locale    — F-05: retrieve cached translations
 *
 * Architecture:
 * - Max ONE LLM call per locale per tenant (idempotent — returns cache if exists).
 * - Uses TranslationService.translateJson() from @wren/llm (no direct SDK calls).
 * - Source of truth: en.json (bundled with API).
 *
 * Auth model:
 * - POST /generate   — requires authentication (preHandler: [authenticate]).
 *                      tenantId resolved from Clerk JWT via request.auth.
 * - GET  /:locale    — public endpoint; no authenticate preHandler.
 *                      tenantId resolved from ?tenantSlug query param (DB lookup).
 *                      Public because the web client fetches translations before
 *                      auth state is settled (locale must load on mount).
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '@wren/db'
import { getTranslationService } from '@wren/llm'
import { authenticate } from '../plugins/auth'
import { isSupported } from '../lib/i18n-support'
import enMessages from '../i18n/en.json'

const EN_MESSAGES = enMessages as Record<string, string>

const GenerateLocaleSchema = z.object({
  locale: z.string().min(2).max(10),
})

export async function localeRoutes(fastify: FastifyInstance): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/v1/tenant/locale/generate
  // Triggers LLM translation of en.json for a given locale.
  // Idempotent — returns cached record if already generated.
  // Protected: requires valid Clerk session (authenticate preHandler).
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/generate',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = GenerateLocaleSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: parsed.error.flatten().fieldErrors,
        })
      }

      const { locale } = parsed.data
      const tenantId = request.auth.tenantId

      if (!isSupported(locale)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Locale '${locale}' is not supported.`,
        })
      }

      // English is bundled — never needs LLM generation
      if (locale === 'en') {
        return reply.status(200).send({
          data: EN_MESSAGES,
          cached: true,
          locale: 'en',
        })
      }

      // Check DB cache — idempotent (max 1 LLM call per locale per tenant)
      const existing = await db.tenantLocale.findUnique({
        where: { tenantId_locale: { tenantId, locale } },
      })

      if (existing) {
        // Check for missing keys — en.json may have grown since last generation (Sprint 4b/4c)
        const existingKeys = new Set(Object.keys(existing.translations as Record<string, string>))
        const missingKeys = Object.keys(EN_MESSAGES).filter((k) => !existingKeys.has(k))

        if (missingKeys.length > 0) {
          // Stale cache: delete and fall through to fresh generation below
          fastify.log.info({ tenantId, locale, missingCount: missingKeys.length }, '[locale] Stale UI translations — regenerating')
          await db.tenantLocale.delete({ where: { id: existing.id } })
          // Fall through to generation
        } else {
          // Cache is complete — return it
          const promptLocaleCount = await db.tenantPromptLocale.count({
            where: { tenantId, locale }
          })
          if (promptLocaleCount === 0) {
            triggerPromptTranslation(tenantId, locale).catch(() => {})
          }
          return reply.status(200).send({
            data: existing.translations,
            cached: true,
            locale,
          })
        }
      }

      // Generate — single LLM call for entire JSON blob
      const svc = getTranslationService()
      let translations: Record<string, string>

      try {
        translations = await svc.translateJson(EN_MESSAGES, locale)
      } catch (err) {
        fastify.log.error({ err, locale, tenantId }, 'Translation LLM call failed')
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Translation service temporarily unavailable.',
        })
      }

      // Cache in DB — max one record per locale per tenant
      const record = await db.tenantLocale.create({
        data: { tenantId, locale, translations },
      })

      // F-03: Sprint 4c — also translate prompts for this locale (fire-and-forget)
      triggerPromptTranslation(tenantId, locale).catch((err) =>
        fastify.log.warn({ err, locale, tenantId }, '[F-03] Background prompt translation failed')
      )

      return reply.status(201).send({
        data: record.translations,
        cached: false,
        locale,
      })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tenant/locale/:locale
  // Returns cached translation JSON for tenant. 404 if not generated yet.
  //
  // Public endpoint — no authenticate preHandler.
  // tenantId is resolved from ?tenantSlug query param (web client always has slug
  // from the URL). Falls back to request.auth.tenantId if an authenticated request
  // is made directly (e.g. from tests or admin tools).
  // Missing/invalid tenantSlug → 400. Not-yet-generated locale → 404.
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get<{ Params: { locale: string }; Querystring: { tenantSlug?: string } }>(
    '/:locale',
    async (
      request: FastifyRequest<{ Params: { locale: string }; Querystring: { tenantSlug?: string } }>,
      reply: FastifyReply
    ) => {
      const { locale } = request.params

      // English always available from bundle — no DB lookup needed
      if (locale === 'en') {
        return reply.status(200).send({ data: EN_MESSAGES, locale: 'en' })
      }

      // Resolve tenantId: prefer tenantSlug query param (public path), fallback to auth
      const tenantSlug = request.query.tenantSlug ?? ''
      let tenantId = ''

      if (tenantSlug) {
        // Single indexed lookup by slug (unique index on Tenant.slug) — O(log n)
        const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } })
        tenantId = tenant?.id ?? ''
      }

      if (!tenantId) {
        // Fallback: authenticated requests still work (e.g. admin tools, tests)
        tenantId = (request as any).auth?.tenantId ?? ''
      }

      if (!tenantId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'tenantSlug query param is required.',
        })
      }

      const record = await db.tenantLocale.findUnique({
        where: { tenantId_locale: { tenantId, locale } },
      })

      if (!record) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Locale '${locale}' has not been generated for this tenant. POST /api/v1/tenant/locale/generate first.`,
        })
      }

      return reply.status(200).send({
        data: record.translations,
        locale,
        generatedAt: record.generatedAt,
      })
    }
  )
}


// ─── Sprint 4c: F-03 — background prompt translation helper ──────────────────

/**
 * Translates all prompts for a tenant+locale in the background.
 * Called after UI translations are generated so that prompt translations
 * are also ready when the user first browses the Prompt Library.
 */
async function triggerPromptTranslation(tenantId: string, locale: string): Promise<void> {
  const allPrompts = await db.prompt.findMany({
    where: { isPublic: true },
    select: { id: true, title: true, description: true, formSchema: true },
  })

  if (allPrompts.length === 0) return

  const existing = await db.tenantPromptLocale.findMany({
    where: { tenantId, locale, stale: false },
    select: { promptId: true },
  })
  const alreadyDone = new Set(existing.map((r) => r.promptId))

  const toTranslate = allPrompts.filter((p) => !alreadyDone.has(p.id))

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
      console.warn(`[F-03] Background prompt translation failed for prompt ${p.id} (${locale}):`, err)
      // Continue with next prompt
    }
  }
}
