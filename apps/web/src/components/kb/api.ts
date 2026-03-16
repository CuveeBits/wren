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

interface KbStore {
  collections: KbCollection[]
  documents: KbDocument[]
}

interface ListDocumentsOptions {
  query?: string
  mode?: KbSearchMode
  collectionId?: string | null
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const STORAGE_KEY = 'wren.kb.mock.store.v1'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

function mockId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function buildMockStore(): KbStore {
  const now = new Date()
  const earlier = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString()
  const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString()
  const today = now.toISOString()

  const collections: KbCollection[] = [
    { id: 'col-general', parentId: null, name: 'General', createdAt: earlier, updatedAt: today },
    { id: 'col-policies', parentId: null, name: 'Policies', createdAt: earlier, updatedAt: yesterday },
    { id: 'col-hr', parentId: 'col-policies', name: 'HR', createdAt: yesterday, updatedAt: today },
    { id: 'col-product', parentId: null, name: 'Product', createdAt: earlier, updatedAt: yesterday },
  ]

  const documents: KbDocument[] = [
    {
      id: 'doc-handbook',
      title: 'Employee Handbook 2026',
      fileName: 'employee-handbook-2026.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4_293_128,
      source: 'upload',
      status: 'ready',
      tags: ['hr', 'policy', 'onboarding'],
      summary: 'Core policies, onboarding steps, leave rules, and benefits coverage.',
      createdAt: yesterday,
      updatedAt: today,
      collectionId: 'col-hr',
      collectionName: 'HR',
      chunkCount: 18,
      chunks: [
        {
          id: 'chunk-handbook-1',
          chunkIndex: 0,
          pageNumber: 1,
          content: 'Welcome to Wren. This handbook outlines team values, manager expectations, and the standard onboarding path for all new hires.',
        },
        {
          id: 'chunk-handbook-2',
          chunkIndex: 1,
          pageNumber: 4,
          content: 'Paid time off is accrued monthly. Regional holidays are managed at the tenant level and should be confirmed with your manager.',
        },
        {
          id: 'chunk-handbook-3',
          chunkIndex: 2,
          pageNumber: 9,
          content: 'Security training is mandatory within the first week. Access to production systems requires completion of the checklist in the IT portal.',
        },
      ],
    },
    {
      id: 'doc-security',
      title: 'Security Controls Overview',
      fileName: 'security-controls.txt',
      mimeType: 'text/plain',
      sizeBytes: 98_422,
      source: 'upload',
      status: 'ready',
      tags: ['security', 'compliance'],
      summary: 'Baseline security controls, audit practices, and incident escalation.',
      createdAt: earlier,
      updatedAt: today,
      collectionId: 'col-policies',
      collectionName: 'Policies',
      chunkCount: 11,
      chunks: [
        {
          id: 'chunk-security-1',
          chunkIndex: 0,
          content: 'All customer data is encrypted at rest and in transit. Secrets are stored in managed vault infrastructure with audited access.',
        },
        {
          id: 'chunk-security-2',
          chunkIndex: 1,
          content: 'Security incidents must be acknowledged within 15 minutes and escalated to the incident commander immediately.',
        },
        {
          id: 'chunk-security-3',
          chunkIndex: 2,
          content: 'Quarterly access reviews are required for production systems, BI tools, and vendor dashboards that process customer data.',
        },
      ],
    },
    {
      id: 'doc-launch',
      title: 'Q2 Launch Messaging',
      fileName: 'q2-launch-messaging.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 1_184_250,
      source: 'upload',
      status: 'processing',
      tags: ['marketing', 'launch'],
      summary: 'Messaging pillars and launch narrative.',
      createdAt: today,
      updatedAt: today,
      collectionId: 'col-product',
      collectionName: 'Product',
      chunkCount: 0,
      chunks: [],
    },
    {
      id: 'doc-retention',
      title: 'Customer Retention Playbook',
      fileName: 'customer-retention-playbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2_104_320,
      source: 'generated',
      status: 'error',
      errorMessage: 'Embedding provider timed out while processing page 12.',
      tags: ['success', 'playbook'],
      summary: null,
      createdAt: yesterday,
      updatedAt: today,
      collectionId: 'col-general',
      collectionName: 'General',
      chunkCount: 0,
      chunks: [],
    },
  ]

  return { collections, documents }
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStore(): KbStore {
  if (!canUseStorage()) return buildMockStore()
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = buildMockStore()
    writeStore(initial)
    return initial
  }

  try {
    return JSON.parse(raw) as KbStore
  } catch {
    const initial = buildMockStore()
    writeStore(initial)
    return initial
  }
}

function writeStore(store: KbStore) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

function matchesDocument(document: KbDocument, query: string, mode: KbSearchMode) {
  if (!query) return true
  const haystack = [
    document.title,
    document.fileName,
    document.collectionName ?? '',
    document.summary ?? '',
    ...document.tags,
    ...document.chunks.map((chunk) => chunk.content),
  ]
    .join(' ')
    .toLowerCase()

  const needle = query.toLowerCase()
  if (mode === 'semantic') {
    return haystack.includes(needle) || document.tags.some((tag) => tag.includes(needle))
  }
  return haystack.includes(needle)
}

function withCollectionNames(store: KbStore): KbDocument[] {
  return store.documents.map((document) => ({
    ...document,
    collectionName:
      store.collections.find((collection) => collection.id === document.collectionId)?.name ??
      document.collectionName ??
      null,
  }))
}

function updateMockDocumentStatus(document: KbDocument): KbDocument {
  if (document.status !== 'processing') return document

  const ageMs = Date.now() - new Date(document.createdAt).getTime()
  if (ageMs > 12_000) {
    return {
      ...document,
      status: 'ready',
      updatedAt: new Date().toISOString(),
      chunkCount: document.chunkCount || 6,
      summary: document.summary ?? 'Recently uploaded document ready for retrieval and citations.',
      chunks:
        document.chunks.length > 0
          ? document.chunks
          : [
              {
                id: `${document.id}-chunk-1`,
                chunkIndex: 0,
                content: `First parsed chunk from ${document.title}. Spark routes are not live yet, so this preview is generated in the UI fallback.`,
              },
              {
                id: `${document.id}-chunk-2`,
                chunkIndex: 1,
                content: 'Documents uploaded through the fallback pipeline still support tag editing and selection from prompt execution.',
              },
              {
                id: `${document.id}-chunk-3`,
                chunkIndex: 2,
                content: 'Once the API routes land, this client helper can switch to the real backend without changing the components.',
              },
            ],
    }
  }

  return document
}

function syncMockStatuses() {
  const store = readStore()
  const next = {
    ...store,
    documents: store.documents.map(updateMockDocumentStatus),
  }
  writeStore(next)
  return next
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
  try {
    const json = await fetchJson<{ data: KbCollection[] }>('/api/v1/kb/collections', {
      credentials: 'include',
    })
    return json.data
  } catch {
    return syncMockStatuses().collections
  }
}

export async function listKbDocuments(
  options: ListDocumentsOptions = {}
): Promise<KbDocument[]> {
  const { query = '', mode = 'keyword', collectionId } = options

  try {
    const qs = new URLSearchParams()
    if (query) qs.set('query', query)
    if (collectionId) qs.set('collectionId', collectionId)
    qs.set('mode', mode)
    const json = await fetchJson<{ data: KbDocument[] }>(`/api/v1/kb/documents?${qs}`, {
      credentials: 'include',
    })
    return json.data
  } catch {
    const store = syncMockStatuses()
    return withCollectionNames(store).filter((document) => {
      const collectionMatch = collectionId ? document.collectionId === collectionId : true
      return collectionMatch && matchesDocument(document, query, mode)
    })
  }
}

export async function getKbDocument(id: string): Promise<KbDocument | null> {
  try {
    const json = await fetchJson<{ data: KbDocument }>(`/api/v1/kb/documents/${id}`, {
      credentials: 'include',
    })
    return json.data
  } catch {
    const store = syncMockStatuses()
    return withCollectionNames(store).find((document) => document.id === id) ?? null
  }
}

export async function createKbCollection(
  name: string,
  parentId: string | null = null
): Promise<KbCollection> {
  try {
    const json = await fetchJson<{ data: KbCollection }>('/api/v1/kb/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, parentId }),
    })
    return json.data
  } catch {
    const store = readStore()
    const next: KbCollection = {
      id: mockId('col'),
      name,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    writeStore({ ...store, collections: [...store.collections, next] })
    return next
  }
}

export async function renameKbCollection(id: string, name: string): Promise<KbCollection> {
  try {
    const json = await fetchJson<{ data: KbCollection }>(`/api/v1/kb/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    })
    return json.data
  } catch {
    const store = readStore()
    const collections = store.collections.map((collection) =>
      collection.id === id ? { ...collection, name, updatedAt: new Date().toISOString() } : collection
    )
    writeStore({ ...store, collections })
    const updated = collections.find((collection) => collection.id === id)
    if (!updated) throw new Error('Collection not found')
    return updated
  }
}

export async function deleteKbCollection(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/kb/collections/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
  } catch {
    const store = readStore()
    const collectionsToRemove = new Set([id])
    let changed = true

    while (changed) {
      changed = false
      for (const collection of store.collections) {
        if (collection.parentId && collectionsToRemove.has(collection.parentId) && !collectionsToRemove.has(collection.id)) {
          collectionsToRemove.add(collection.id)
          changed = true
        }
      }
    }

    writeStore({
      collections: store.collections.filter((collection) => !collectionsToRemove.has(collection.id)),
      documents: store.documents.map((document) =>
        collectionsToRemove.has(document.collectionId ?? '') ? { ...document, collectionId: null, collectionName: null } : document
      ),
    })
  }
}

export async function updateKbDocumentTags(id: string, tags: string[]): Promise<KbDocument> {
  try {
    const json = await fetchJson<{ data: KbDocument }>(`/api/v1/kb/documents/${id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tags }),
    })
    return json.data
  } catch {
    const store = readStore()
    const documents = store.documents.map((document) =>
      document.id === id ? { ...document, tags, updatedAt: new Date().toISOString() } : document
    )
    writeStore({ ...store, documents })
    const updated = documents.find((document) => document.id === id)
    if (!updated) throw new Error('Document not found')
    return updated
  }
}

export async function uploadKbDocument(
  file: File,
  collectionId: string | null,
  onProgress: (progress: number) => void
): Promise<KbDocument> {
  const validationError = validateKbFile(file)
  if (validationError) throw new Error(validationError)

  try {
    const formData = new FormData()
    formData.set('file', file)
    if (collectionId) formData.set('collectionId', collectionId)

    const document = await new Promise<KbDocument>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/api/v1/kb/documents`)
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
  } catch {
    const progressSteps = [12, 28, 45, 67, 84, 100]
    for (const step of progressSteps) {
      onProgress(step)
      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }

    const store = readStore()
    const collectionName =
      store.collections.find((collection) => collection.id === collectionId)?.name ?? null
    const now = new Date().toISOString()
    const next: KbDocument = {
      id: mockId('doc'),
      title: file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      mimeType: file.type || 'text/plain',
      sizeBytes: file.size,
      source: 'upload',
      status: 'processing',
      tags: [],
      summary: null,
      createdAt: now,
      updatedAt: now,
      collectionId,
      collectionName,
      chunkCount: 0,
      chunks: [],
    }
    writeStore({ ...store, documents: [next, ...store.documents] })
    return next
  }
}

export async function getKbDocumentStatus(id: string): Promise<KbDocumentStatus> {
  try {
    const json = await fetchJson<{ data: { status: KbDocumentStatus } }>(`/api/v1/kb/documents/${id}/status`, {
      credentials: 'include',
    })
    return json.data.status
  } catch {
    const document = await getKbDocument(id)
    return document?.status ?? 'error'
  }
}
