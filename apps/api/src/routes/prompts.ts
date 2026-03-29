/**
 * Prompt Library API routes — Sprint 1 + Sprint 2.
 *
 * GET  /api/v1/prompts              → paginated list with filters (PUBLIC)
 * GET  /api/v1/prompts/meta/depts   → distinct department values (PUBLIC)
 * GET  /api/v1/prompts/meta/cats    → distinct category values (PUBLIC)
 * GET  /api/v1/prompts/:id          → single prompt + formSchema (PUBLIC)
 * POST /api/v1/prompts/:id/execute  → render template + stream LLM response (PROTECTED)
 *
 * Sprint 2 additions (F-05, F-06):
 * - execute accepts optional documentIds[] for KB context injection
 * - execute accepts optional saveToKb flag to store output as KbDocument
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '@wren/db'
import { executePrompt } from '@wren/llm'
import type { CitationRef } from '@wren/llm'
import { authenticate } from '../plugins/auth'
import { getLanguageInstruction } from '../lib/i18n-support'
import { config } from '../config'
import { retrieveChunks } from '../services/kb/retrieval'
import type { KbChunkResult } from '../services/kb/retrieval'
import { createId } from '@paralleldrive/cuid2'

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
  /** Sprint 2 (F-05): optional KB document IDs for context injection */
  documentIds: z.array(z.string()).max(20).optional(),
  /** Sprint 4c (F-06): locale for language-aware LLM responses */
  locale: z.string().min(2).max(10).optional(),
  /** Optional pre-ranked KB chunks from /kb/context. */
  kbContext: z.array(
    z.object({
      id: z.string(),
      documentId: z.string(),
      content: z.string(),
      tokenCount: z.number(),
      chunkIndex: z.number().int(),
      pageNumber: z.number().int().nullable(),
      similarity: z.number(),
      documentTitle: z.string(),
      documentFileName: z.string(),
    })
  ).max(20).optional(),
  /** Sprint 2 (F-06): save generated output back to KB */
  saveToKb: z.boolean().optional().default(false),
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
        select: { id: true, promptTemplate: true, title: true },
      })
      if (!prompt) return reply.status(404).send({ error: 'Prompt not found' })

      const { variables, documentIds, kbContext, saveToKb, locale } = bodyResult.data
      const { tenantId } = request.auth

      // ── Sprint 2 (F-05): KB context injection ────────────────────────────
      let systemMessage: string | undefined
      let citations: CitationRef[] = []

      const providedChunks: KbChunkResult[] = kbContext ?? []

      if (providedChunks.length > 0 || (documentIds && documentIds.length > 0)) {
        try {
          const chunks = providedChunks.length > 0
            ? providedChunks
            : await retrieveChunks(
                Object.values(variables).join(' ').slice(0, 500),
                documentIds ?? [],
                5
              )

          if (chunks.length > 0) {
            // Build system message with source-cited context
            const contextBlocks = chunks.map((c, i) => {
              const pageInfo = c.pageNumber != null ? ` (page ${c.pageNumber})` : ''
              return `[Source ${i + 1}: ${c.documentTitle}${pageInfo}]\n${c.content}`
            })
            systemMessage = [
              'You have access to the following knowledge base content. Use it to inform your response.',
              'Cite sources inline as [Source N] when drawing on this content.',
              '',
              ...contextBlocks,
              '',
              'Now respond to the user prompt using the above context where relevant.',
            ].join('\n')

            citations = chunks.map((c) => ({
              chunkId:          c.id,
              documentId:       c.documentId,
              documentTitle:    c.documentTitle,
              documentFileName: c.documentFileName,
              excerpt:          c.content.slice(0, 200),
              pageNumber:       c.pageNumber ?? undefined,
              chunkIndex:       c.chunkIndex,
            }))
          }
        } catch (err) {
          // KB context is best-effort — log and continue without it
          fastify.log.warn({ err }, '[F-05] KB context retrieval failed, continuing without context')
        }
      }

      const requestOrigin = request.headers['origin'] ?? '*'
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Credentials': 'true',
      })

      // Emit citations event first so UI can render the citation panel
      if (citations.length > 0) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`)
      }

      let completed = false
      let fullOutput = ''

      try {
        // F-06: Sprint 4c — prepend language instruction to system message
        const langInstruction = getLanguageInstruction(locale ?? '')
        const finalSystemMessage = langInstruction
          ? [langInstruction, systemMessage].filter(Boolean).join('\n\n')
          : systemMessage

        const generator = executePrompt({
          promptTemplate: prompt.promptTemplate,
          variables,
          litellmBaseUrl: config.litellmBaseUrl,
          litellmApiKey: config.litellmApiKey,
          systemMessage: finalSystemMessage,
          stream: true,
        })
        for await (const chunk of generator) {
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
          if (chunk.type === 'chunk' && chunk.content) {
            fullOutput += chunk.content
          }
          if (chunk.type === 'done') completed = true
        }
      } catch (err) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })}\n\n`)
      } finally {
        reply.raw.end()
      }

      if (completed) {
        // Increment usage count (fire-and-forget)
        // Sprint 4c (F-07): usageCount-only update does NOT mark TenantPromptLocale as stale.
        // Stale invalidation belongs in admin CRUD routes (PATCH/DELETE /prompts/:id) when
        // title or description changes. Add it there when admin CRUD is implemented.
        db.prompt.update({ where: { id: prompt.id }, data: { usageCount: { increment: 1 } } })
          .catch((err: unknown) => fastify.log.warn({ err }, 'Failed to increment usageCount'))

        // ── Sprint 2 (F-06): Save to KB ────────────────────────────────────
        if (saveToKb && fullOutput.trim()) {
          saveOutputToKb(tenantId, prompt.title, fullOutput).catch((err: unknown) =>
            fastify.log.warn({ err }, '[F-06] Failed to save output to KB')
          )
        }
      }
    }
  )
}

/**
 * Sprint 2 (F-06): Persist generated output as a new KbDocument.
 * The document is stored with source='generated' and status='ready'
 * (no binary file to parse — the text is already available).
 */
async function saveOutputToKb(
  tenantId: string,
  promptTitle: string,
  outputText: string
): Promise<void> {
  // Ensure the tenant has a KB (auto-provision if needed)
  const kb = await db.knowledgeBase.upsert({
    where: { tenantId },
    create: { id: createId(), tenantId, name: 'Knowledge Base' },
    update: {},
  })

  const docId = createId()
  const now = new Date()
  const title = `Generated: ${promptTitle} — ${now.toISOString().slice(0, 10)}`

  await db.kbDocument.create({
    data: {
      id:              docId,
      knowledgeBaseId: kb.id,
      title,
      fileName:        `generated-${docId}.txt`,
      mimeType:        'text/plain',
      sizeBytes:       Buffer.byteLength(outputText, 'utf-8'),
      storageKey:      `generated/${docId}.txt`,
      source:          'generated',
      status:          'processing',
    },
  })

  // Enqueue ingest job — we write the text to a temp file for the worker to parse
  const { writeFile, mkdtemp } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { tmpdir } = await import('node:os')
  const tmpDir = await mkdtemp(join(tmpdir(), 'wren-kb-'))
  const filePath = join(tmpDir, `${docId}.txt`)
  await writeFile(filePath, outputText, 'utf-8')

  // Fire ingest inline (no Redis required for generated docs — small text)
  const { ingestDocument } = await import('../kb/ingest-inline')
  await ingestDocument({ documentId: docId, filePath, mimeType: 'text/plain', knowledgeBaseId: kb.id })
}
