/**
 * Inline KB ingest for generated text — Sprint 2 (F-06).
 *
 * Light version of the worker ingest used directly in the API process
 * for "Save to KB" generated outputs. Only handles plain text (no file parsing).
 * Chunks, embeds, stores chunks, auto-tags, and marks document ready.
 *
 * Called fire-and-forget from the execute route after streaming completes.
 */
import { db } from '@wren/db'
import { createId } from '@paralleldrive/cuid2'

interface InlineIngestOptions {
  documentId:     string
  filePath:       string     // path to temp file containing the text
  mimeType:       string
  knowledgeBaseId: string
}

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'
const LITELLM_BASE_URL = process.env['LITELLM_BASE_URL'] ?? 'http://localhost:4000'
const LITELLM_API_KEY  = process.env['LITELLM_API_KEY']  ?? 'sk-dev-master-key'
const TAGGER_MODEL     = process.env['TAGGER_MODEL']     ?? 'wren-fast'

const TAXONOMY = ['Brand', 'Product', 'Competitor', 'Process', 'Legal', 'Customer Research', 'Other'] as const
type KbTag = (typeof TAXONOMY)[number]

const CHUNK_SIZE = 2048  // ~512 tokens
const OVERLAP    = 204   // ~10%

export async function ingestDocument(opts: InlineIngestOptions): Promise<void> {
  const { readFile } = await import('node:fs/promises')
  const text = await readFile(opts.filePath, 'utf-8')

  if (!text.trim()) {
    await db.kbDocument.update({
      where: { id: opts.documentId },
      data: { status: 'error', errorMessage: 'Empty output text', updatedAt: new Date() },
    })
    return
  }

  // Chunk
  const chunks = simpleChunk(text)

  // Embed + store
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content)
    const vectorLiteral = `[${embedding.join(',')}]`
    const chunkId = createId()
    await db.$executeRaw`
      INSERT INTO "KbChunk" ("id","documentId","content","tokenCount","chunkIndex","embedding","createdAt")
      VALUES (${chunkId},${opts.documentId},${chunk.content},${chunk.tokenCount},${chunk.index},
              ${vectorLiteral}::vector, NOW())
      ON CONFLICT ("id") DO NOTHING
    `
  }

  // Auto-tag
  const tags = await autoTag(text)
  const summary = text.slice(0, 500).replace(/\s+/g, ' ').trim()

  await db.kbDocument.update({
    where: { id: opts.documentId },
    data: {
      status: 'ready',
      tags,
      summary,
      metadata: { chunkCount: chunks.length, source: 'generated' },
      updatedAt: new Date(),
    },
  })
}

function simpleChunk(text: string): Array<{ content: string; tokenCount: number; index: number }> {
  const chunks: Array<{ content: string; tokenCount: number; index: number }> = []
  let pos = 0
  let idx = 0
  while (pos < text.length) {
    const end = Math.min(pos + CHUNK_SIZE, text.length)
    const content = text.slice(pos, end).trim()
    if (content) {
      chunks.push({ content, tokenCount: Math.ceil(content.length / 4), index: idx++ })
    }
    pos += CHUNK_SIZE - OVERLAP
  }
  return chunks
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Ollama embed ${res.status}`)
  return ((await res.json()) as { embedding: number[] }).embedding
}

async function autoTag(text: string): Promise<KbTag[]> {
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ baseURL: LITELLM_BASE_URL, apiKey: LITELLM_API_KEY })
    const response = await client.chat.completions.create({
      model: TAGGER_MODEL,
      messages: [{ role: 'user', content: `Classify this document into one or more of: ${TAXONOMY.join(', ')}. Reply ONLY with a JSON array, e.g. ["Brand"]. Text: ${text.slice(0, 2000)}` }],
      max_tokens: 100,
      temperature: 0,
    })
    const content = response.choices[0]?.message.content ?? '["Other"]'
    const parsed = JSON.parse(content.replace(/```(?:json)?\n?/g, '').trim()) as unknown
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((t): t is KbTag => TAXONOMY.includes(t as KbTag))
      return valid.length > 0 ? valid : ['Other']
    }
  } catch { /* fall through */ }
  return ['Other']
}
