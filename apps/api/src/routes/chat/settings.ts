/**
 * Chat settings routes — S-08.
 *
 * S-08: GET  /chat/settings — get TenantChatSettings (upsert if not exists)
 *        PUT  /chat/settings — update tenant chat settings
 *
 * Auth: Clerk JWT via authenticate preHandler. tenantId from request.auth.
 * Validation: Zod on all inputs. systemPrompt ≤ 8000 chars enforced here.
 *
 * NOTE: Depends on services/chat.ts — Forge's F-05 implementation target.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../plugins/auth'
import { getChatSettings, updateChatSettings } from '../../services/chat'

// ── Zod schemas ───────────────────────────────────────────────────────────────

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

const UpdateChatSettingsBodySchema = z
  .object({
    systemPrompt: z
      .string()
      .max(8000, 'System prompt must not exceed 8000 characters')
      .nullable()
      .optional(),
    welcomeMessage: z.string().max(1000).nullable().optional(),
    launcherLabel: z.string().trim().min(1).max(64).nullable().optional(),
    logoUrl: z.string().url('logoUrl must be a valid URL').nullable().optional(),
    brandColor: z
      .string()
      .regex(HEX_COLOR_RE, 'brandColor must be a hex colour (#RRGGBB)')
      .nullable()
      .optional(),
    accentColor: z
      .string()
      .regex(HEX_COLOR_RE, 'accentColor must be a hex colour (#RRGGBB)')
      .nullable()
      .optional(),
    widgetTitle: z.string().trim().min(1).max(120).nullable().optional(),
    allowedOrigins: z
      .array(
        z
          .string()
          .url('Each allowedOrigin must be a valid URL')
          .refine(
            (o) => {
              try {
                const url = new URL(o)
                // Must be an origin — no path, no query
                return (
                  (url.protocol === 'http:' || url.protocol === 'https:') &&
                  url.pathname === '/' &&
                  !url.search &&
                  !url.hash
                )
              } catch {
                return false
              }
            },
            { message: 'Each entry must be a bare origin (e.g. https://example.com)' }
          )
      )
      .max(50, 'Maximum 50 allowed origins')
      .optional(),
    model: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided' }
  )

// ── Route registration ────────────────────────────────────────────────────────

export async function chatSettingsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /chat/settings ────────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const settings = await getChatSettings(request.auth.tenantId)
      return reply.send({ data: settings })
    }
  )

  // ── PUT /chat/settings ────────────────────────────────────────────────────
  // Using PUT (idempotent full settings update) as well as PATCH semantics.
  // Both PUT and PATCH are registered on the same handler — partial updates OK.
  const updateHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const bodyResult = UpdateChatSettingsBodySchema.safeParse(request.body)
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Validation error',
        fields: bodyResult.error.flatten().fieldErrors,
      })
    }

    const settings = await updateChatSettings({
      tenantId: request.auth.tenantId,
      ...bodyResult.data,
    })

    return reply.send({ data: settings })
  }

  fastify.put('/', { preHandler: [authenticate] }, updateHandler)
  fastify.patch('/', { preHandler: [authenticate] }, updateHandler)
}
