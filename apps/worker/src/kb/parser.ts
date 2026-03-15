/**
 * Document parser — Sprint 2 (F-02).
 *
 * Supports PDF (pdf-parse), DOCX (mammoth), and plain text / markdown.
 * Returns extracted text and optional metadata (page count, etc.).
 *
 * Rule 5: This is called from the ingest worker (>500ms operation).
 */
import * as fs from 'node:fs/promises'

export interface ParseResult {
  text: string
  pageCount?: number
  metadata?: Record<string, unknown>
}

export async function parseDocument(
  filePath: string,
  mimeType: string
): Promise<ParseResult> {
  if (mimeType === 'application/pdf') {
    return parsePdf(filePath)
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return parseDocx(filePath)
  }

  // Plain text / markdown / anything else text-based
  return parsePlainText(filePath)
}

async function parsePdf(filePath: string): Promise<ParseResult> {
  // Dynamic import to avoid loading pdfParse at startup
  const pdfParse = (await import('pdf-parse')).default
  const buffer = await fs.readFile(filePath)
  const result = await pdfParse(buffer)
  return {
    text: result.text,
    pageCount: result.numpages,
    metadata: { pdfInfo: result.info as Record<string, unknown> },
  }
}

async function parseDocx(filePath: string): Promise<ParseResult> {
  const mammoth = await import('mammoth')
  const buffer = await fs.readFile(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return { text: result.value, metadata: { messages: result.messages } }
}

async function parsePlainText(filePath: string): Promise<ParseResult> {
  const text = await fs.readFile(filePath, 'utf-8')
  return { text }
}
