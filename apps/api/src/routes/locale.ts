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
        return reply.status(200).send({
          data: existing.translations,
          cached: true,
          locale,
        })
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
