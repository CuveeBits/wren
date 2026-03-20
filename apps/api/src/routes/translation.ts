/**
 * Translation routes — Sprint 4 S-01.
 *
 * POST /api/v1/translate        — translate text, tenant-scoped, auth-gated
 * POST /api/v1/translate/detect — detect language of text
 *
 * Auth: Clerk JWT via authenticate preHandler. tenantId from request.auth.
 * All translation via @wren/llm → LiteLLM → Ollama (ADR-005, Rule 2).
 * Rule 3: all endpoints require auth middleware.
 * Rule 4: TypeScript strict mode, no any.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../plugins/auth'
import { translate, detectLanguage } from '@wren/llm'
import { config } from '../config'

// ── Zod schemas ───────────────────────────────────────────────────────────────

const TranslateBodySchema = z.object({
  text: z.string().trim().min(1).max(32_000),
  fromLang: z
    .string()
    .regex(/^[a-z]{2}$/, 'fromLang must be an ISO 639-1 code')
    .optional(),
  toLang: z
    .string()
    .regex(/^[a-z]{2}$/, 'toLang must be an ISO 639-1 code'),
})

const DetectBodySchema = z.object({
  text: z.string().trim().min(1).max(32_000),
})

// ── Route registration ────────────────────────────────────────────────────────

export async function translationRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /translate ─────────────────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = TranslateBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const { text, fromLang, toLang } = bodyResult.data
      const translationConfig = {
        litellmBaseUrl: config.litellmBaseUrl,
        litellmApiKey: config.litellmApiKey,
      }

      // Detect source language if not provided
      const sourceLang =
        fromLang ?? (await detectLanguage(text, translationConfig))

      const translated = await translate(text, sourceLang, toLang, translationConfig)

      return reply.send({
        data: { translated, fromLang: sourceLang, toLang },
      })
    }
  )

  // ── POST /translate/detect ──────────────────────────────────────────────
  fastify.post(
    '/detect',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = DetectBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const translationConfig = {
        litellmBaseUrl: config.litellmBaseUrl,
        litellmApiKey: config.litellmApiKey,
      }

      const language = await detectLanguage(bodyResult.data.text, translationConfig)

      return reply.send({ data: { language } })
    }
  )
}
