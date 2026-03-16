'use client'

export type KbSearchMode = 'keyword' | 'semantic'
export type KbDocumentStatus = 'processing' | 'ready' | 'error'

export interface KbCollection {
  id: string
  parentId: string | null
  name: string
  createdAt: string
  updatedAt: string
}

export interface KbChunkPreview {
  id: string
  content: string
  chunkIndex: number
  pageNumber?: number
}

export interface KbContextChunk {
  id: string
  documentId: string
  content: string
  tokenCount: number
  chunkIndex: number
  pageNumber?: number | null
  similarity: number
  documentTitle: string
  documentFileName: string
}

export interface KbDocument {
  id: string
  title: string
  fileName: string
  mimeType: string
  sizeBytes: number
  source: string
  status: KbDocumentStatus
  errorMessage?: string | null
  tags: string[]
  summary?: string | null
  createdAt: string
  updatedAt: string
  collectionId: string | null
  collectionName: string | null
  chunkCount: number
  chunks: KbChunkPreview[]
}

interface ListDocumentsOptions {
  query?: string
  mode?: KbSearchMode
  collectionId?: string | null
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function getAcceptedMimeTypes() {
  return ACCEPTED_TYPES
}

export function validateKbFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds 20MB limit.'
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Only PDF, DOCX, and TXT files are supported.'
  }
  return null
}

export async function listKbCollections(): Promise<KbCollection[]> {
  const json = await fetchJson<{ data: KbCollection[] }>('/api/v1/kb/collections', {
    credentials: 'include',
  })
  return json.data
}

export async function listKbDocuments(
  options: ListDocumentsOptions = {}
): Promise<KbDocument[]> {
  const { query = '', mode = 'keyword', collectionId } = options
  const qs = new URLSearchParams()
  if (query) qs.set('q', query)
  qs.set('mode', mode)
  if (collectionId) qs.set('collectionId', collectionId)
  const path = query ? '/api/v1/kb/search' : '/api/v1/kb/documents'
  const json = await fetchJson<{ data: KbDocument[] }>(`${path}?${qs}`, {
    credentials: 'include',
  })
  return json.data
}

interface GetKbContextOptions {
  promptId: string
  documentIds: string[]
  query: string
}

export async function getKbContext(
  options: GetKbContextOptions
): Promise<KbContextChunk[]> {
  const json = await fetchJson<{ data: KbContextChunk[] }>('/api/v1/kb/context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options),
  })
  return json.data
}

export async function getKbDocument(id: string): Promise<KbDocument | null> {
  const json = await fetchJson<{ data: KbDocument }>(`/api/v1/kb/documents/${id}`, {
    credentials: 'include',
  })
  return json.data
}

export async function createKbCollection(
  name: string,
  parentId: string | null = null
): Promise<KbCollection> {
  const json = await fetchJson<{ data: KbCollection }>('/api/v1/kb/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, parentId }),
  })
  return json.data
}

export async function renameKbCollection(id: string, name: string): Promise<KbCollection> {
  const json = await fetchJson<{ data: KbCollection }>(`/api/v1/kb/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  return json.data
}

export async function deleteKbCollection(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/kb/collections/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
}

export async function updateKbDocumentTags(id: string, tags: string[]): Promise<KbDocument> {
  const json = await fetchJson<{ data: KbDocument }>(`/api/v1/kb/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tags }),
  })
  return json.data
}

export async function uploadKbDocument(
  file: File,
  collectionId: string | null,
  onProgress: (progress: number) => void
): Promise<KbDocument> {
  const validationError = validateKbFile(file)
  if (validationError) throw new Error(validationError)

  const formData = new FormData()
  formData.set('file', file)
  if (collectionId) formData.set('collectionId', collectionId)

  const document = await new Promise<KbDocument>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/v1/kb/documents/upload`)
    xhr.withCredentials = true
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed: ${xhr.status}`))
        return
      }
      const json = JSON.parse(xhr.responseText) as { data: KbDocument }
      resolve(json.data)
    }
    xhr.send(formData)
  })

  onProgress(100)
  return document
}

export async function getKbDocumentStatus(id: string): Promise<KbDocumentStatus> {
  const json = await fetchJson<{ data: { status: KbDocumentStatus } }>(
    `/api/v1/kb/documents/${id}/status`,
    {
      credentials: 'include',
    }
  )
  return json.data.status
}
