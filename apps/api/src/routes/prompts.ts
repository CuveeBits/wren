/**
 * Prompt Library API routes — Sprint 1.
 *
 * GET  /api/v1/prompts              → paginated list with filters
 * GET  /api/v1/prompts/meta/depts   → distinct department values
 * GET  /api/v1/prompts/meta/cats    → distinct category values
 * GET  /api/v1/prompts/:id          → single prompt + formSchema
 * POST /api/v1/prompts/:id/execute  → render template + stream LLM response (SSE)
 *
 * Rule 1: every DB query includes tenantId (or checks isPublic for global prompts)
 * Rule 3: all routes require auth via [authenticate] preHandler
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '@wren/db'
import { executePrompt } from '@wren/llm'
import { authenticate } from '../plugins/auth'
import { config } from '../config'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
  department: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
})

const ExecuteBodySchema = z.object({
  variables: z.record(z.string()),
})

// ─── Route plugin ─────────────────────────────────────────────────────────────

export async function promptRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /prompts/meta/depts ───────────────────────────────────────────────
  // Must be registered BEFORE /:id routes to avoid param capture.
  fastify.get(
    '/meta/depts',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.auth

      // Return departments from global prompts (tenantId = null) plus tenant-specific ones
      const rows = await db.prompt.findMany({
        where: {
          OR: [{ tenantId: null, isPublic: true }, { tenantId }],
        },
        select: { department: true },
        distinct: ['department'],
        orderBy: { department: 'asc' },
      })

      return reply.send({ data: rows.map((r) => r.department) })
    }
  )

  // ── GET /prompts/meta/cats ────────────────────────────────────────────────
  fastify.get(
    '/meta/cats',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.auth

      const rows = await db.prompt.findMany({
        where: {
          OR: [{ tenantId: null, isPublic: true }, { tenantId }],
        },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      })

      return reply.send({ data: rows.map((r) => r.category) })
    }
  )

  // ── GET /prompts ──────────────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.auth

      const queryResult = ListQuerySchema.safeParse(request.query)
      if (!queryResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: queryResult.error.flatten().fieldErrors,
        })
      }

      const { department, category, search, difficulty, page, limit } =
        queryResult.data

      const where = {
        OR: [
          { tenantId: null, isPublic: true as const },
          { tenantId },
        ],
        ...(department ? { department } : {}),
        ...(category ? { category } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      }

      const [total, prompts] = await Promise.all([
        db.prompt.count({ where }),
        db.prompt.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            department: true,
            difficulty: true,
            estimatedMinutesSaved: true,
            usageCount: true,
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
        }),
      ])

      return reply.send({
        data: prompts,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      })
    }
  )

  // ── GET /prompts/:id ──────────────────────────────────────────────────────
  fastify.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.auth
      const { id } = request.params as { id: string }

      const prompt = await db.prompt.findFirst({
        where: {
          id,
          OR: [{ tenantId: null, isPublic: true }, { tenantId }],
        },
      })

      if (!prompt) {
        return reply.status(404).send({ error: 'Prompt not found' })
      }

      return reply.send({ data: prompt })
    }
  )

  // ── POST /prompts/:id/execute ─────────────────────────────────────────────
  fastify.post(
    '/:id/execute',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.auth
      const { id } = request.params as { id: string }

      // Validate body
      const bodyResult = ExecuteBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const { variables } = bodyResult.data

      // Fetch prompt — must be accessible to this tenant
      const prompt = await db.prompt.findFirst({
        where: {
          id,
          OR: [{ tenantId: null, isPublic: true }, { tenantId }],
        },
        select: { id: true, promptTemplate: true },
      })

      if (!prompt) {
        return reply.status(404).send({ error: 'Prompt not found' })
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      let completed = false

      try {
        const generator = executePrompt({
          promptTemplate: prompt.promptTemplate,
          variables,
          litellmBaseUrl: config.litellmBaseUrl,
          litellmApiKey: config.litellmApiKey,
          stream: true,
        })

        for await (const chunk of generator) {
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
          if (chunk.type === 'done') {
            completed = true
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'error', message })}\n\n`
        )
      } finally {
        reply.raw.end()
      }

      // Fire-and-forget: increment usage count after successful completion
      if (completed) {
        db.prompt
          .update({
            where: { id: prompt.id },
            data: { usageCount: { increment: 1 } },
          })
          .catch((err: unknown) => {
            fastify.log.warn({ err, promptId: prompt.id }, 'Failed to increment prompt usageCount')
          })
      }
    }
  )
}
