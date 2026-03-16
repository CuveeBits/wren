/**
 * POST /api/v1/kb/context — Sprint 2 (F-04).
 *
 * Given { documentIds, query, topK? }, retrieves the most relevant KB chunks
 * using pgvector cosine similarity and returns them for client-side injection
 * into the prompt execution flow.
 *
 * PROTECTED: requires Clerk JWT → tenantId.
 * Rule 1: documentIds are validated to belong to the calling tenant's KB.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '@wren/db'
import { authenticate } from '../../plugins/auth'
import { retrieveChunks } from '../../services/kb/retrieval'

const ContextBodySchema = z.object({
  documentIds: z.array(z.string().cuid()).min(1).max(20),
  query:       z.string().min(1).max(2000),
  topK:        z.number().int().min(1).max(20).default(5),
})

export async function kbContextRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /kb/context
   * Returns ranked chunks for injection into a prompt execution.
   */
  fastify.post(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = ContextBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const { documentIds, query, topK } = bodyResult.data
      const { tenantId } = request.auth

      // Rule 1: verify all documentIds belong to this tenant's KB
      const kb = await db.knowledgeBase.findUnique({
        where: { tenantId },
        select: { id: true },
      })
      if (!kb) {
        return reply.status(404).send({ error: 'Knowledge base not found for this tenant' })
      }

      const ownedDocs = await db.kbDocument.findMany({
        where: { id: { in: documentIds }, knowledgeBaseId: kb.id },
        select: { id: true },
      })
      const ownedIds = ownedDocs.map((d) => d.id)

      if (ownedIds.length !== documentIds.length) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'One or more documents do not belong to your organisation',
        })
      }

      const chunks = await retrieveChunks(query, ownedIds, topK)

      return reply.send({ data: chunks })
    }
  )
}
