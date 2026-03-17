import { createHash } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type Redis from 'ioredis'
import { Queue } from 'bullmq'
import { createId } from '@paralleldrive/cuid2'
import type { Prisma } from '@wren/db'
import { db } from '@wren/db'
import { z } from 'zod'
import { authenticate } from '../../plugins/auth'
import { searchChunksKeyword, searchChunksSemantic } from '../../services/kb/retrieval'

const KB_INDEX_QUEUE = 'kb-index'
const KB_NAME = 'Knowledge Base'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 256 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])
const UPLOAD_ROOT = join(process.cwd(), 'apps/api/uploads/kb')

const CollectionCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().min(1).nullable().optional(),
})

const CollectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().min(1).nullable().optional(),
}).refine((value) => value.name !== undefined || value.parentId !== undefined, {
  message: 'At least one field must be provided',
})

const DocumentListQuerySchema = z.object({
  collectionId: z.string().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  status: z.enum(['processing', 'ready', 'error']).optional(),
  q: z.string().trim().min(1).optional(),
})

const DocumentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  collectionId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
}).refine((value) => value.title !== undefined || value.collectionId !== undefined || value.tags !== undefined, {
  message: 'At least one field must be provided',
})

const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(2000),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  mode: z.enum(['semantic', 'keyword']).optional(),
})

interface KbRouteOptions {
  redis: Redis
}

interface ParsedMultipartFieldMap {
  [key: string]: string | string[]
}

interface ParsedMultipartUpload {
  file: {
    buffer: Buffer
    fileName: string
    mimeType: string
  }
  fields: ParsedMultipartFieldMap
}

type DocumentWithRelations = Prisma.KbDocumentGetPayload<{
  include: {
    collection: { select: { id: true, name: true, parentId: true } }
    _count: { select: { chunks: true } }
  }
}>

function mapDocument(document: DocumentWithRelations) {
  const { collection, _count, ...rest } = document

  return {
    ...rest,
    collectionName: collection?.name ?? null,
    chunkCount: _count?.chunks ?? 0,
  }
}

export async function kbRoutes(
  fastify: FastifyInstance,
  options: KbRouteOptions
): Promise<void> {
  const kbIndexQueue = new Queue(KB_INDEX_QUEUE, { connection: options.redis })

  fastify.addHook('onClose', async () => {
    await kbIndexQueue.close()
  })

  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      return reply.send({ data: kb })
    }
  )

  fastify.get(
    '/collections',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const collections = await db.kbCollection.findMany({
        where: { knowledgeBaseId: kb.id },
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      })
      return reply.send({ data: collections })
    }
  )

  fastify.post(
    '/collections',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = CollectionCreateSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const parentId = bodyResult.data.parentId ?? null

      if (parentId) {
        const parent = await db.kbCollection.findFirst({
          where: { id: parentId, knowledgeBaseId: kb.id },
          select: { id: true, parentId: true },
        })
        if (!parent) return reply.status(404).send({ error: 'Parent collection not found' })
        if (parent.parentId) {
          return reply.status(422).send({ error: 'Collections support only one level of nesting' })
        }
      }

      const collection = await db.kbCollection.create({
        data: {
          id: createId(),
          knowledgeBaseId: kb.id,
          name: bodyResult.data.name,
          parentId,
        },
      })

      return reply.status(201).send({ data: collection })
    }
  )

  fastify.patch(
    '/collections/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const bodyResult = CollectionUpdateSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const collection = await db.kbCollection.findFirst({
        where: { id, knowledgeBaseId: kb.id },
        select: { id: true },
      })
      if (!collection) return reply.status(404).send({ error: 'Collection not found' })

      if (bodyResult.data.parentId === id) {
        return reply.status(422).send({ error: 'A collection cannot be its own parent' })
      }

      let nextParentId: string | null | undefined = bodyResult.data.parentId
      if (nextParentId) {
        const parent = await db.kbCollection.findFirst({
          where: { id: nextParentId, knowledgeBaseId: kb.id },
          select: { id: true, parentId: true },
        })
        if (!parent) return reply.status(404).send({ error: 'Parent collection not found' })
        if (parent.parentId) {
          return reply.status(422).send({ error: 'Collections support only one level of nesting' })
        }
      }

      const updated = await db.kbCollection.update({
        where: { id },
        data: {
          ...(bodyResult.data.name !== undefined ? { name: bodyResult.data.name } : {}),
          ...(nextParentId !== undefined ? { parentId: nextParentId } : {}),
        },
      })

      return reply.send({ data: updated })
    }
  )

  fastify.delete(
    '/collections/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const collection = await db.kbCollection.findFirst({
        where: { id, knowledgeBaseId: kb.id },
        select: { id: true },
      })
      if (!collection) return reply.status(404).send({ error: 'Collection not found' })

      await db.$transaction([
        db.kbDocument.updateMany({
          where: { knowledgeBaseId: kb.id, collectionId: id },
          data: { collectionId: null },
        }),
        db.kbCollection.updateMany({
          where: { knowledgeBaseId: kb.id, parentId: id },
          data: { parentId: null },
        }),
        db.kbCollection.delete({ where: { id } }),
      ])

      return reply.send({ data: { id } })
    }
  )

  fastify.get(
    '/documents',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryResult = DocumentListQuerySchema.safeParse(getRequestQuery(request))
      if (!queryResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: queryResult.error.flatten().fieldErrors,
        })
      }

      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const { collectionId, tag, status, q } = queryResult.data
      const where: Prisma.KbDocumentWhereInput = { knowledgeBaseId: kb.id }

      if (collectionId) where['collectionId'] = collectionId
      if (tag) where['tags'] = { has: tag }
      if (status) where['status'] = status
      if (q) {
        where['AND'] = [
          { knowledgeBaseId: kb.id },
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { fileName: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
            ],
          },
        ]
        delete where['knowledgeBaseId']
      }

      const documents = await db.kbDocument.findMany({
        where,
        include: {
          collection: { select: { id: true, name: true, parentId: true } },
          _count: { select: { chunks: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
      })

      return reply.send({ data: documents.map(mapDocument) })
    }
  )

  fastify.get(
    '/documents/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const document = await db.kbDocument.findFirst({
        where: { id, knowledgeBaseId: kb.id },
        include: {
          collection: { select: { id: true, name: true, parentId: true } },
          _count: { select: { chunks: true } },
          chunks: {
            select: { id: true, content: true, chunkIndex: true, pageNumber: true, tokenCount: true },
            orderBy: { chunkIndex: 'asc' },
            take: 5,
          },
        },
      })
      if (!document) return reply.status(404).send({ error: 'Document not found' })
      return reply.send({ data: mapDocument(document) })
    }
  )

  fastify.post(
    '/documents/upload',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let parsed: ParsedMultipartUpload
      try {
        parsed = await parseMultipartUpload(request)
      } catch (error) {
        const message = getErrorMessage(error, 'Invalid multipart upload')
        const statusCode = message.includes('File too large') ? 413 : 422
        return reply.status(statusCode === 422 ? 400 : statusCode).send({
          error: 'Validation error',
          message,
        })
      }

      let kb: Awaited<ReturnType<typeof ensureKnowledgeBase>>
      try {
        kb = await ensureKnowledgeBase(request.auth.tenantId)
      } catch (error) {
        return reply.status(500).send({
          error: 'Storage failure',
          message: getErrorMessage(error, 'Failed to initialize knowledge base'),
        })
      }
      const collectionId = getSingleField(parsed.fields, 'collectionId')
      const requestedTitle = getSingleField(parsed.fields, 'title')

      if (collectionId) {
        const collection = await db.kbCollection.findFirst({
          where: { id: collectionId, knowledgeBaseId: kb.id },
          select: { id: true },
        })
        if (!collection) return reply.status(404).send({ error: 'Collection not found' })
      }

      const docId = createId()
      const safeName = sanitizeFileName(parsed.file.fileName)
      const hashedPrefix = createHash('sha1').update(`${docId}:${safeName}`).digest('hex').slice(0, 12)
      const storageKey = join(request.auth.tenantId, `${hashedPrefix}-${safeName}`)
      const filePath = join(UPLOAD_ROOT, storageKey)

      try {
        await mkdir(join(UPLOAD_ROOT, request.auth.tenantId), { recursive: true })
        await writeFile(filePath, parsed.file.buffer)
      } catch (error) {
        return reply.status(500).send({
          error: 'Storage failure',
          message: getErrorMessage(error, 'Failed to persist uploaded file'),
        })
      }

      const title = requestedTitle?.trim() || stripExtension(safeName)

      let document
      try {
        document = await db.kbDocument.create({
          data: {
            id: docId,
            knowledgeBaseId: kb.id,
            collectionId: collectionId ?? null,
            title,
            fileName: safeName,
            mimeType: parsed.file.mimeType,
            sizeBytes: parsed.file.buffer.length,
            storageKey,
            status: 'processing',
            source: 'upload',
          },
        })
      } catch (error) {
        await unlink(filePath).catch(() => undefined)
        throw error
      }

      try {
        await kbIndexQueue.add('ingest-document', {
          documentId: document.id,
          filePath,
          mimeType: document.mimeType,
          knowledgeBaseId: kb.id,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to enqueue ingest job'
        await db.kbDocument.update({
          where: { id: document.id },
          data: { status: 'error', errorMessage: message },
        })
        return reply.status(500).send({ error: 'Failed to enqueue ingest job' })
      }

      return reply.status(201).send({ data: document })
    }
  )

  fastify.patch(
    '/documents/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const bodyResult = DocumentUpdateSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: bodyResult.error.flatten().fieldErrors,
        })
      }

      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const document = await db.kbDocument.findFirst({
        where: { id, knowledgeBaseId: kb.id },
        select: { id: true },
      })
      if (!document) return reply.status(404).send({ error: 'Document not found' })

      if (bodyResult.data.collectionId) {
        const collection = await db.kbCollection.findFirst({
          where: { id: bodyResult.data.collectionId, knowledgeBaseId: kb.id },
          select: { id: true },
        })
        if (!collection) return reply.status(404).send({ error: 'Collection not found' })
      }

      const updated = await db.kbDocument.update({
        where: { id },
        data: {
          ...(bodyResult.data.title !== undefined ? { title: bodyResult.data.title } : {}),
          ...(bodyResult.data.collectionId !== undefined ? { collectionId: bodyResult.data.collectionId } : {}),
          ...(bodyResult.data.tags !== undefined ? { tags: bodyResult.data.tags } : {}),
        },
        include: {
          collection: { select: { id: true, name: true, parentId: true } },
          _count: { select: { chunks: true } },
        },
      })

      return reply.send({ data: mapDocument(updated) })
    }
  )

  fastify.delete(
    '/documents/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const document = await db.kbDocument.findFirst({
        where: { id, knowledgeBaseId: kb.id },
        select: { id: true, source: true, storageKey: true },
      })
      if (!document) return reply.status(404).send({ error: 'Document not found' })

      await db.kbDocument.delete({ where: { id } })

      if (document.source === 'upload' && document.storageKey) {
        const filePath = join(UPLOAD_ROOT, document.storageKey)
        unlink(filePath).catch(() => undefined)
      }

      return reply.send({ data: { id } })
    }
  )

  fastify.get(
    '/documents/:id/status',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const document = await db.kbDocument.findFirst({
        where: { id, knowledgeBaseId: kb.id },
        select: { id: true, status: true, errorMessage: true, updatedAt: true },
      })
      if (!document) return reply.status(404).send({ error: 'Document not found' })
      return reply.send({ data: document })
    }
  )

  fastify.get(
    '/search',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryResult = SearchQuerySchema.safeParse(getRequestQuery(request))
      if (!queryResult.success) {
        return reply.status(422).send({
          error: 'Validation error',
          fields: queryResult.error.flatten().fieldErrors,
        })
      }

      const kb = await ensureKnowledgeBase(request.auth.tenantId)
      const chunks =
        queryResult.data.mode === 'semantic'
          ? await searchChunksSemantic(queryResult.data.q, kb.id, queryResult.data.limit)
          : await searchChunksKeyword(queryResult.data.q, kb.id, queryResult.data.limit)
      return reply.send({ data: chunks })
    }
  )
}

function getRequestQuery(request: FastifyRequest) {
  return request.query as Record<string, unknown>
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function ensureKnowledgeBase(tenantId: string) {
  return db.knowledgeBase.upsert({
    where: { tenantId },
    create: { id: createId(), tenantId, name: KB_NAME },
    update: {},
    include: {
      _count: {
        select: {
          collections: true,
          documents: true,
        },
      },
    },
  })
}

async function parseMultipartUpload(request: FastifyRequest): Promise<ParsedMultipartUpload> {
  const contentType = request.headers['content-type']
  const boundary = getMultipartBoundary(contentType)
  if (!boundary) throw new Error('Content-Type must be multipart/form-data with a boundary')

  const body = await readRequestBody(request, MAX_MULTIPART_BYTES)
  const text = body.toString('latin1')
  const parts = text.split(`--${boundary}`)

  const fields: ParsedMultipartFieldMap = {}
  let upload: ParsedMultipartUpload['file'] | null = null

  for (const rawPart of parts) {
    let part = rawPart
    if (!part || part === '--' || part === '--\r\n') continue
    if (part.startsWith('\r\n')) part = part.slice(2)
    if (part.endsWith('\r\n')) part = part.slice(0, -2)
    if (part.endsWith('--')) part = part.slice(0, -2)
    if (!part.trim()) continue

    const splitIndex = part.indexOf('\r\n\r\n')
    if (splitIndex === -1) continue

    const headerBlock = part.slice(0, splitIndex)
    const bodyBlock = part.slice(splitIndex + 4)
    const headers = parsePartHeaders(headerBlock)
    const disposition = headers['content-disposition']
    if (!disposition) continue

    const nameMatch = disposition.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const fieldName = nameMatch[1]
    const fileNameMatch = disposition.match(/filename="([^"]*)"/)

    if (fileNameMatch && fileNameMatch[1]) {
      if (upload) throw new Error('Only one file may be uploaded at a time')
      const mimeType = headers['content-type']?.trim()
      if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new Error('Unsupported file type. Allowed types: PDF, DOCX, TXT')
      }

      const fileBuffer = Buffer.from(bodyBlock, 'latin1')
      if (fileBuffer.length === 0) throw new Error('File is required')
      if (fileBuffer.length > MAX_UPLOAD_BYTES) throw new Error('File too large. Maximum size is 20 MB')

      upload = {
        buffer: fileBuffer,
        fileName: fileNameMatch[1],
        mimeType,
      }
      continue
    }

    const value = bodyBlock.trim()
    const currentValue = fields[fieldName]
    if (currentValue === undefined) {
      fields[fieldName] = value
    } else if (Array.isArray(currentValue)) {
      currentValue.push(value)
    } else {
      fields[fieldName] = [currentValue, value]
    }
  }

  if (!upload) throw new Error('File is required')
  return { file: upload, fields }
}

async function readRequestBody(request: FastifyRequest, maxBytes: number): Promise<Buffer> {
  // When Fastify has already parsed the body (addContentTypeParser with parseAs=buffer),
  // use request.body directly instead of re-reading the consumed stream.
  if (Buffer.isBuffer(request.body)) {
    if (request.body.length > maxBytes) throw new Error('File too large. Maximum size is 20 MB')
    return request.body
  }

  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of request.raw) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > maxBytes) throw new Error('File too large. Maximum size is 20 MB')
    chunks.push(buffer)
  }

  return Buffer.concat(chunks)
}

function getMultipartBoundary(contentType: string | undefined): string | null {
  if (!contentType) return null
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  return match?.[1] ?? match?.[2] ?? null
}

function parsePartHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of headerBlock.split('\r\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    headers[key] = value
  }
  return headers
}

function getSingleField(fields: ParsedMultipartFieldMap, name: string): string | undefined {
  const value = fields[name]
  if (Array.isArray(value)) return value[0]
  return value
}

function sanitizeFileName(fileName: string): string {
  const baseName = basename(fileName).replace(/[/\\]/g, '')
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '-')
  return sanitized || `upload-${createId()}.bin`
}

function stripExtension(fileName: string): string {
  const extension = extname(fileName)
  return extension ? fileName.slice(0, -extension.length) : fileName
}
