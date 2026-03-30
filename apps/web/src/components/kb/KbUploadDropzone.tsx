'use client'

import * as React from 'react'
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { Button, cn } from '@wren/ui'
import { useTranslations } from '@/i18n/translations-context'
import {
  getKbDocumentStatus,
  uploadKbDocument,
  validateKbFile,
  type KbDocument,
} from './api'

interface KbUploadDropzoneProps {
  collectionId: string | null
  onUploaded?: (document: KbDocument) => void
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'ready' | 'error'

export function KbUploadDropzone({ collectionId, onUploaded }: KbUploadDropzoneProps) {
  const t = useTranslations()
  const [isDragging, setIsDragging] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [state, setState] = React.useState<UploadState>('idle')
  const [message, setMessage] = React.useState<string | null>(null)
  const [currentDocumentId, setCurrentDocumentId] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const displayMessage = message ?? t('kb.upload.hint')

  React.useEffect(() => {
    if (!currentDocumentId || state !== 'processing') return

    const timer = window.setInterval(async () => {
      try {
        const status = await getKbDocumentStatus(currentDocumentId)
        if (status === 'ready') {
          setState('ready')
          setMessage(t('kb.upload.complete'))
          window.clearInterval(timer)
        } else if (status === 'error') {
          setState('error')
          setMessage(t('kb.upload.statusFailed'))
          window.clearInterval(timer)
        }
      } catch (error) {
        setState('error')
        setMessage(error instanceof Error ? error.message : t('kb.upload.failed'))
        window.clearInterval(timer)
      }
    }, 2000)

    return () => window.clearInterval(timer)
  }, [currentDocumentId, state, t])

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    const validationError = validateKbFile(file)
    if (validationError) {
      setState('error')
      setMessage(validationError)
      return
    }

    setState('uploading')
    setProgress(0)
    setMessage(t('kb.upload.uploading').replace('{name}', file.name))

    try {
      const document = await uploadKbDocument(file, collectionId, setProgress)
      onUploaded?.(document)
      setCurrentDocumentId(document.id)
      setState(document.status === 'ready' ? 'ready' : 'processing')
      setMessage(
        document.status === 'ready'
          ? t('kb.upload.complete')
          : t('kb.upload.processing')
      )
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : t('kb.upload.failed'))
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 p-5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border border-transparent px-6 py-10 text-center transition-colors',
          isDragging && 'border-primary bg-primary/5'
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === 'processing' || state === 'uploading' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : state === 'ready' ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : state === 'error' ? (
            <XCircle className="h-6 w-6" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t('kb.upload.title')}</h3>
          <p className="text-xs text-muted-foreground">{displayMessage}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            {t('kb.upload.chooseFile')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('kb.upload.dragDrop')}</p>
        </div>
      </div>

      {(state === 'uploading' || state === 'processing' || state === 'ready') && (
        <div className="mt-4 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full bg-primary transition-all',
                state === 'processing' && 'animate-pulse'
              )}
              style={{ width: `${state === 'processing' ? 100 : progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {state === 'processing'
              ? t('kb.upload.polling')
              : t('kb.upload.progress').replace('{progress}', String(progress))}
          </p>
        </div>
      )}
    </div>
  )
}
