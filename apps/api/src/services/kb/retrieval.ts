/**
 * RAG retrieval service — Sprint 2 (F-04).
 *
 * Given a query string and a list of KbDocument IDs, returns the top-k
 * most relevant KbChunks using pgvector cosine similarity.
 *
 * Uses db.$queryRaw (tag form) for the pgvector <=> operator.
 *
 * Rule 1: Always filter by documentIds (tenant-scoped via knowledgeBaseId).
 */
import { db } from '@wren/db'

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'

export interface KbChunkResult {
  id:               string
  documentId:       string
  content:          string
  tokenCount:       number
  chunkIndex:       number
  pageNumber:       number | null
  similarity:       number
  documentTitle:    string
  documentFileName: string
}

/**
 * Retrieve top-k semantically relevant chunks for the given query
 * from the specified documents.
 */
export async function retrieveChunks(
  query: string,
  documentIds: string[],
  topK = 5
): Promise<KbChunkResult[]> {
  if (documentIds.length === 0) return []

  const queryEmbedding = await embedQuery(query)
  const vectorStr = `[${queryEmbedding.join(',')}]`

  // Use db.$queryRaw tag form — preserves case-sensitive quoted identifiers
  const results = await db.$queryRaw<KbChunkResult[]>`
    SELECT
      c."id",
      c."documentId",
      c."content",
      c."tokenCount",
      c."chunkIndex",
      c."pageNumber",
      (1 - (c."embedding" <=> ${vectorStr}::vector)) AS "similarity",
      d."title"    AS "documentTitle",
      d."fileName" AS "documentFileName"
    FROM "KbChunk"    c
    JOIN "KbDocument" d ON d."id" = c."documentId"
    WHERE c."documentId" = ANY(${documentIds}::text[])
      AND c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${vectorStr}::vector
    LIMIT ${topK}
  `

  return results
}

/**
 * Semantic search across all chunks in a knowledge base using pgvector ANN.
 */
export async function searchChunksSemantic(
  query: string,
  knowledgeBaseId: string,
  topK = 10
): Promise<KbChunkResult[]> {
  const queryEmbedding = await embedQuery(query)
  const vectorStr = `[${queryEmbedding.join(',')}]`

  const results = await db.$queryRaw<KbChunkResult[]>`
    SELECT
      c."id",
      c."documentId",
      c."content",
      c."tokenCount",
      c."chunkIndex",
      c."pageNumber",
      (1 - (c."embedding" <=> ${vectorStr}::vector)) AS "similarity",
      d."title"    AS "documentTitle",
      d."fileName" AS "documentFileName"
    FROM "KbChunk"    c
    JOIN "KbDocument" d ON d."id" = c."documentId"
    WHERE d."knowledgeBaseId" = ${knowledgeBaseId}
      AND c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${vectorStr}::vector
    LIMIT ${topK}
  `

  return results
}

/**
 * Full-text search across all chunks in a knowledge base.
 */
export async function searchChunksKeyword(
  query: string,
  knowledgeBaseId: string,
  topK = 10
): Promise<KbChunkResult[]> {
  const results = await db.$queryRaw<KbChunkResult[]>`
    SELECT
      c."id",
      c."documentId",
      c."content",
      c."tokenCount",
      c."chunkIndex",
      c."pageNumber",
      ts_rank(to_tsvector('english', c."content"), plainto_tsquery('english', ${query})) AS "similarity",
      d."title"    AS "documentTitle",
      d."fileName" AS "documentFileName"
    FROM "KbChunk"    c
    JOIN "KbDocument" d ON d."id" = c."documentId"
    WHERE d."knowledgeBaseId" = ${knowledgeBaseId}
      AND to_tsvector('english', c."content") @@ plainto_tsquery('english', ${query})
    ORDER BY "similarity" DESC, c."chunkIndex" ASC
    LIMIT ${topK}
  `

  return results
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(`Ollama embed error ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { embedding: number[] }
  return data.embedding
}
