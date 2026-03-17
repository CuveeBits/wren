/**
 * KB types — shared between packages/agents and apps/api.
 * Defined here to avoid cross-package imports (ADR-005).
 */

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
