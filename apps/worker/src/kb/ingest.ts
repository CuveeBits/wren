/**
 * KB ingest orchestrator — Sprint 2 (F-02, F-03).
 *
 * Pipeline: parse → chunk → embed → store chunks → auto-tag → update status.
 *
 * Called by the kb:index BullMQ worker processor.
 * Every step is idempotent — safe to retry on failure.
 *
 * Job data shape: KbIngestJobData (see below)
 */
import { db } from '@wren/db'
import { randomUUID } from 'node:crypto'
import { parseDocument } from './parser'
import { chunkText } from './chunker'
import { embedText } from './embedder'
import { autoTag } from './tagger'

export interface KbIngestJobData {
  documentId:     string
  filePath:       string  // absolute local path where the file was saved
  mimeType:       string
  knowledgeBaseId: string
}

export async function ingestDocument(data: KbIngestJobData): Promise<void> {
  const { documentId, filePath, mimeType } = data

  try {
    // 1. Parse
    console.log(`[ingest] Parsing document ${documentId} (${mimeType})`)
    const parsed = await parseDocument(filePath, mimeType)

    if (!parsed.text.trim()) {
      await markError(documentId, 'Document contains no extractable text')
      return
    }

    // 2. Chunk
    console.log(`[ingest] Chunking document ${documentId}`)
    const chunks = chunkText(parsed.text)

    if (chunks.length === 0) {
      await markError(documentId, 'Chunker produced no chunks')
      return
    }

    // 3. Embed + store each chunk
    console.log(`[ingest] Embedding ${chunks.length} chunks for document ${documentId}`)
    for (const chunk of chunks) {
      const { embedding } = await embedText(chunk.content)
      const chunkId = randomUUID()
      const vectorLiteral = `[${embedding.join(',')}]`

      await db.$executeRaw`
        INSERT INTO "KbChunk" ("id", "documentId", "content", "tokenCount", "chunkIndex", "pageNumber", "embedding", "createdAt")
        VALUES (
          ${chunkId},
          ${documentId},
          ${chunk.content},
          ${chunk.tokenCount},
          ${chunk.chunkIndex},
          ${chunk.pageNumber ?? null},
          ${vectorLiteral}::vector,
          NOW()
        )
        ON CONFLICT ("id") DO NOTHING
      `
    }

    // 4. Auto-tag using first 2000 chars
    console.log(`[ingest] Auto-tagging document ${documentId}`)
    const tags = await autoTag(parsed.text)

    // 5. Update document: ready + tags + summary
    const summary = parsed.text.slice(0, 500).replace(/\s+/g, ' ').trim()
    await db.kbDocument.update({
      where: { id: documentId },
      data: {
        status: 'ready',
        tags,
        summary,
        metadata: {
          pageCount:  parsed.pageCount,
          chunkCount: chunks.length,
          ...(parsed.metadata ?? {}),
        },
        updatedAt: new Date(),
      },
    })

    console.log(`[ingest] Document ${documentId} ingested — ${chunks.length} chunks, tags: ${tags.join(', ')}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[ingest] Failed to ingest document ${documentId}:`, err)
    await markError(documentId, message)
    throw err  // re-throw so BullMQ retries
  }
}

async function markError(documentId: string, message: string): Promise<void> {
  await db.kbDocument.update({
    where: { id: documentId },
    data: { status: 'error', errorMessage: message, updatedAt: new Date() },
  })
}
