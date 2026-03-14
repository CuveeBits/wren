/**
 * Prompt Library API routes — Sprint 1.
 *
 * GET  /api/v1/prompts              → paginated list with filters (PUBLIC)
 * GET  /api/v1/prompts/meta/depts   → distinct department values (PUBLIC)
 * GET  /api/v1/prompts/meta/cats    → distinct category values (PUBLIC)
 * GET  /api/v1/prompts/:id          → single prompt + formSchema (PUBLIC)
 * POST /api/v1/prompts/:id/execute  → render template + stream LLM response (PROTECTED)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '@wren/db'
import { executePrompt } from '@wren/llm'
import { authenticate } from '../plugins/auth'
import { config } from '../config'

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

export async function promptRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /prompts/meta/depts (PUBLIC) ──────────────────────────────────────
  fastify.get('/meta/depts', async (_request: FastifyRequest, reply: FastifyReply) => {
    const rows = await db.prompt.findMany({
      where: { isPublic: true },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    })
    return reply.send({ data: rows.map((r: { department: string }) => r.department) })
  })

  // ── GET /prompts/meta/cats (PUBLIC) ───────────────────────────────────────
  fastify.get('/meta/cats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const rows = await db.prompt.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    return reply.send({ data: rows.map((r: { category: string }) => r.category) })
  })

  // ── GET /prompts (PUBLIC) ─────────────────────────────────────────────────
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryResult = ListQuerySchema.safeParse(request.query)
    if (!queryResult.success) {
      return reply.status(422).send({
        error: 'Validation error',
        fields: queryResult.error.flatten().fieldErrors,
      })
    }

    const { department, category, search, difficulty, page, limit } = queryResult.data

    const where: Record<string, unknown> = { isPublic: true }
    if (department) where['department'] = department
    if (category) where['category'] = category
    if (difficulty) where['difficulty'] = difficulty
    if (search) {
      where['OR'] = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
      delete where['isPublic']
      ;(where['AND'] as unknown[]) = [
        { isPublic: true },
        { OR: where['OR'] },
      ]
      delete where['OR']
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

    return reply.send({ data: prompts, meta: { total, page, limit, pages: Math.ceil(total / limit) } })
  })

  // ── GET /prompts/:id (PUBLIC) ─────────────────────────────────────────────
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const prompt = await db.prompt.findFirst({ where: { id, isPublic: true } })
    if (!prompt) return reply.status(404).send({ error: 'Prompt not found' })
    return reply.send({ data: prompt })
  })

  // ── POST /prompts/:id/execute (PROTECTED) ─────────────────────────────────
  fastify.post(
    '/:id/execute',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      const bodyResult = ExecuteBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({ error: 'Validation error', fields: bodyResult.error.flatten().fieldErrors })
      }

      const prompt = await db.prompt.findFirst({
        where: { id, isPublic: true },
        select: { id: true, promptTemplate: true },
      })
      if (!prompt) return reply.status(404).send({ error: 'Prompt not found' })

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
          variables: bodyResult.data.variables,
          litellmBaseUrl: config.litellmBaseUrl,
          litellmApiKey: config.litellmApiKey,
          stream: true,
        })
        for await (const chunk of generator) {
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
          if (chunk.type === 'done') completed = true
        }
      } catch (err) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })}\n\n`)
      } finally {
        reply.raw.end()
      }

      if (completed) {
        db.prompt.update({ where: { id: prompt.id }, data: { usageCount: { increment: 1 } } })
          .catch((err: unknown) => fastify.log.warn({ err }, 'Failed to increment usageCount'))
      }
    }
  )
}
