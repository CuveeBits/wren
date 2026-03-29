'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Skeleton } from '@wren/ui'
import { KbCollectionTree } from '@/components/kb/KbCollectionTree'
import { KbDocumentCard } from '@/components/kb/KbDocumentCard'
import { KbSearchBar, type KbSearchValue } from '@/components/kb/KbSearchBar'
import { KbUploadDropzone } from '@/components/kb/KbUploadDropzone'
import { useTranslations } from '@/i18n/translations-context'
import {
  createKbCollection,
  deleteKbCollection,
  listKbCollections,
  listKbDocuments,
  renameKbCollection,
  type KbCollection,
  type KbDocument,
} from '@/components/kb/api'

export default function KbBrowsePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const t = useTranslations()

  const [collections, setCollections] = React.useState<KbCollection[]>([])
  const [documents, setDocuments] = React.useState<KbDocument[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState<KbSearchValue>({ query: '', mode: 'keyword' })
  const [isLoadingCollections, setIsLoadingCollections] = React.useState(true)
  const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(true)
  const [collectionsError, setCollectionsError] = React.useState<string | null>(null)
  const [documentsError, setDocumentsError] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const loadCollections = React.useCallback(async () => {
    setIsLoadingCollections(true)
    setCollectionsError(null)
    try {
      setCollections(await listKbCollections())
    } catch (error) {
      setCollections([])
      setCollectionsError(error instanceof Error ? error.message : t('kb.failedLoadCollections'))
    } finally {
      setIsLoadingCollections(false)
    }
  }, [t])

  const loadDocuments = React.useCallback(async () => {
    setIsLoadingDocuments(true)
    setDocumentsError(null)
    try {
      setDocuments(
        await listKbDocuments({
          query: search.query,
          mode: search.mode,
          collectionId: selectedCollectionId,
        })
      )
    } catch (error) {
      setDocuments([])
      setDocumentsError(error instanceof Error ? error.message : t('kb.failedLoadDocuments'))
    } finally {
      setIsLoadingDocuments(false)
    }
  }, [search.query, search.mode, selectedCollectionId, t])

  React.useEffect(() => {
    void loadCollections()
  }, [loadCollections])

  React.useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  async function handleCreate(name: string, parentId: string | null) {
    setActionError(null)
    const optimistic: KbCollection = {
      id: `temp-${Date.now()}`,
      name,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setCollections((current) => [...current, optimistic])
    try {
      const created = await createKbCollection(name, parentId)
      setCollections((current) => current.map((collection) => (collection.id === optimistic.id ? created : collection)))
    } catch (error) {
      setCollections((current) => current.filter((collection) => collection.id !== optimistic.id))
      setActionError(error instanceof Error ? error.message : t('kb.failedCreateCollection'))
    }
  }

  async function handleRename(id: string, name: string) {
    setActionError(null)
    const previous = collections
    setCollections((current) => current.map((collection) => (collection.id === id ? { ...collection, name } : collection)))
    try {
      await renameKbCollection(id, name)
    } catch (error) {
      setCollections(previous)
      setActionError(error instanceof Error ? error.message : t('kb.failedRenameCollection'))
    }
  }

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await deleteKbCollection(id)
      await loadCollections()
      await loadDocuments()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('kb.failedDeleteCollection'))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('kb.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('kb.subtitle')}
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            {isLoadingCollections ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full rounded-lg" />
                ))}
              </div>
            ) : collectionsError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {collectionsError}
              </div>
            ) : (
              <KbCollectionTree
                collections={collections}
                selectedCollectionId={selectedCollectionId}
                onSelect={setSelectedCollectionId}
                onCreate={handleCreate}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            )}
          </div>
        </aside>

        <section className="space-y-4">
          <KbSearchBar value={search} onChange={setSearch} />
          <KbUploadDropzone
            collectionId={selectedCollectionId}
            onUploaded={() => {
              setActionError(null)
              void loadDocuments()
            }}
          />

          {isLoadingDocuments ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-border p-5">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : documentsError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-16 text-center text-sm text-destructive">
              {documentsError}
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">{t('kb.noDocumentsTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('kb.noDocumentsHint').replace('{tenant}', tenantSlug)}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {documents.map((document) => (
                <KbDocumentCard key={document.id} tenantSlug={tenantSlug} document={document} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
