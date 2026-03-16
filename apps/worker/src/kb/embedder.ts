/**
 * Embedding generator — Sprint 2 (F-02).
 *
 * Default provider: Ollama nomic-embed-text (768 dims) via HTTP.
 * Fallback: OpenAI text-embedding-3-small (1536 dims) when
 *   EMBEDDING_PROVIDER=openai and OPENAI_API_KEY are set.
 *
 * NOTE: 192.168.0.177:11434 is not reachable from the lab machine.
 * OLLAMA_BASE_URL defaults to http://localhost:11434.
 */

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'
const EMBEDDING_PROVIDER = process.env['EMBEDDING_PROVIDER'] ?? 'ollama'

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  return (
    AbortSignal as typeof AbortSignal & {
      timeout?: (ms: number) => AbortSignal
    }
  ).timeout?.(timeoutMs)
}

export interface EmbedResult {
  embedding: number[]
  dimension: 768 | 1536
}

export async function embedText(text: string): Promise<EmbedResult> {
  if (EMBEDDING_PROVIDER === 'openai') {
    return embedOpenAI(text)
  }
  return embedOllama(text)
}

async function embedOllama(text: string): Promise<EmbedResult> {
  const url = `${OLLAMA_BASE_URL}/api/embeddings`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    signal: createTimeoutSignal(30_000),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Ollama embeddings error ${res.status}: ${body}`)
  }
  const data = (await res.json()) as { embedding: number[] }
  return { embedding: data.embedding, dimension: 768 }
}

async function embedOpenAI(text: string): Promise<EmbedResult> {
  const apiKey = process.env['OPENAI_API_KEY']
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai')
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
    signal: createTimeoutSignal(30_000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI embeddings error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[] }>
  }

  return { embedding: data.data[0]!.embedding, dimension: 1536 }
}
