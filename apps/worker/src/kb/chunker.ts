/**
 * RecursiveCharacterTextSplitter — Sprint 2 (F-02).
 *
 * Port of LangChain's logic without the LangChain dependency.
 * Config: 512 tokens (≈ 2048 chars), 10% overlap (≈ 205 chars).
 * Separators tried in order: double-newline, newline, sentence, space.
 */

export interface Chunk {
  content: string
  tokenCount: number
  chunkIndex: number
  pageNumber?: number
}

const CHARS_PER_TOKEN = 4  // heuristic: 1 token ≈ 4 chars
const CHUNK_TOKENS = 512
const OVERLAP_TOKENS = Math.floor(CHUNK_TOKENS * 0.1)   // 51 tokens

const CHUNK_SIZE  = CHUNK_TOKENS  * CHARS_PER_TOKEN  // 2048 chars
const OVERLAP     = OVERLAP_TOKENS * CHARS_PER_TOKEN  // 204 chars

const SEPARATORS = ['\n\n', '\n', '. ', ' ']

export function chunkText(text: string): Chunk[] {
  const splits = recursiveSplit(text.trim(), SEPARATORS, CHUNK_SIZE)
  const chunks: Chunk[] = []
  let i = 0
  let charOffset = 0

  // Merge splits back into CHUNK_SIZE windows with OVERLAP
  while (charOffset < text.length && i < splits.length) {
    let window = ''
    let j = i
    while (j < splits.length && (window + splits[j]!).length <= CHUNK_SIZE) {
      window += (window ? '' : '') + splits[j]!
      j++
    }
    if (!window && j < splits.length) {
      // Single split is larger than chunk size — take it as-is (truncate to CHUNK_SIZE)
      window = splits[j]!.slice(0, CHUNK_SIZE)
      j++
    }
    if (window.trim()) {
      chunks.push({
        content: window.trim(),
        tokenCount: Math.ceil(window.length / CHARS_PER_TOKEN),
        chunkIndex: chunks.length,
      })
    }

    // Advance by CHUNK_SIZE - OVERLAP to create overlap
    const advance = Math.max(1, j - i - Math.ceil(OVERLAP / 100))
    i += advance
    charOffset += window.length
  }

  return chunks
}

function recursiveSplit(text: string, separators: string[], chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text]

  const separator = separators.find((s) => text.includes(s)) ?? ''
  const splits = separator ? text.split(separator) : [text]

  const goodSplits: string[] = []
  const nextSeparators = separators.slice(separators.indexOf(separator) + 1)

  let current = ''
  for (const split of splits) {
    const candidate = current ? current + separator + split : split
    if (candidate.length <= chunkSize) {
      current = candidate
    } else {
      if (current) goodSplits.push(current)
      if (split.length > chunkSize && nextSeparators.length > 0) {
        goodSplits.push(...recursiveSplit(split, nextSeparators, chunkSize))
        current = ''
      } else {
        current = split
      }
    }
  }
  if (current) goodSplits.push(current)
  return goodSplits
}
