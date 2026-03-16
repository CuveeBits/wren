'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Sparkles, X } from 'lucide-react'
import { Button, Input, Skeleton } from '@wren/ui'
import { KbTagBadge } from '@/components/kb/KbTagBadge'
import { getKbDocument, listKbDocuments, updateKbDocumentTags, type KbDocument } from '@/components/kb/api'

function formatBytes(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  if (sizeBytes >= 1024) return `${Math.round(sizeBytes / 1024)} KB`
  return `${sizeBytes} B`
}

export default function KbDocumentPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>()
  const router = useRouter()

  const [document, setDocument] = React.useState<KbDocument | null>(null)
  const [similarDocuments, setSimilarDocuments] = React.useState<KbDocument[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [tagDraft, setTagDraft] = React.useState('')
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [tagError, setTagError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [doc, allDocuments] = await Promise.all([getKbDocument(id), listKbDocuments()])
        setDocument(doc)
        setSimilarDocuments(allDocuments.filter((candidate) => candidate.id !== id).slice(0, 3))
      } catch (error) {
        setDocument(null)
        setSimilarDocuments([])
        setLoadError(error instanceof Error ? error.message : 'Failed to load document.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id])

  async function handleTagUpdate(tags: string[]) {
    if (!document) return
    setTagError(null)
    const previous = document
    setDocument({ ...document, tags })
    try {
      const updated = await updateKbDocumentTags(document.id, tags)
      setDocument(updated)
    } catch (error) {
      setDocument(previous)
      setTagError(error instanceof Error ? error.message : 'Failed to update tags.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-20 text-center">
        <p className="text-lg font-medium">{loadError ?? 'Document not found'}</p>
        <Button variant="outline" onClick={() => router.push(`/${tenantSlug}/kb`)}>
          Back to KB
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href={`/${tenantSlug}/kb`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Knowledge Base
      </Link>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {document.collectionName ?? 'Unassigned'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{document.title}</h1>
        <p className="text-sm text-muted-foreground">
          {document.fileName} • {formatBytes(document.sizeBytes)} • Uploaded{' '}
          {new Date(document.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Metadata</h2>
                <p className="text-sm text-muted-foreground">Chunk previews and document-level details.</p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {document.chunkCount} chunks
              </div>
            </div>

            <dl className="grid gap-4 rounded-xl bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Filename</dt>
                <dd className="mt-1 text-sm font-medium">{document.fileName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</dt>
                <dd className="mt-1 text-sm font-medium capitalize">{document.status}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Source</dt>
                <dd className="mt-1 text-sm font-medium capitalize">{document.source}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Size</dt>
                <dd className="mt-1 text-sm font-medium">{formatBytes(document.sizeBytes)}</dd>
              </div>
            </dl>

            <div className="mt-6 space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Preview: first 3 chunks</h3>
                <p className="text-xs text-muted-foreground">Use this to verify chunking quality before retrieval.</p>
              </div>

              <div className="space-y-3">
                {document.chunks.slice(0, 3).map((chunk) => (
                  <div key={chunk.id} className="rounded-xl border border-border p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Chunk {chunk.chunkIndex + 1}
                      {chunk.pageNumber ? ` • page ${chunk.pageNumber}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">{chunk.content}</p>
                  </div>
                ))}
                {document.chunks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Chunk previews will appear after processing completes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Tags</h2>
              <p className="text-sm text-muted-foreground">Add or remove retrieval tags for this document.</p>
            </div>

            {tagError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {tagError}
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {document.tags.length > 0 ? (
                document.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => void handleTagUpdate(document.tags.filter((currentTag) => currentTag !== tag))}
                    className="group"
                  >
                    <KbTagBadge
                      tag={tag}
                      className="gap-1 pr-1 group-hover:bg-destructive/10 group-hover:text-destructive"
                    />
                    <X className="-ml-5 inline h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags yet.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder="Add tag"
              />
              <Button
                type="button"
                onClick={() => {
                  const nextTag = tagDraft.trim().toLowerCase()
                  if (!nextTag || document.tags.includes(nextTag)) return
                  setTagDraft('')
                  void handleTagUpdate([...document.tags, nextTag])
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Similar documents</h2>
            </div>
            <div className="space-y-3">
              {similarDocuments.map((similarDocument) => (
                <Link
                  key={similarDocument.id}
                  href={`/${tenantSlug}/kb/documents/${similarDocument.id}`}
                  className="block rounded-xl border border-border p-4 transition-colors hover:bg-accent/40"
                >
                  <p className="font-medium">{similarDocument.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Placeholder ranking until Spark’s similarity endpoint is committed.
                  </p>
                </Link>
              ))}
              {similarDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground">No similar document suggestions yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
