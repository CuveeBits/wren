'use client'

import * as React from 'react'
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { Button, cn } from '@wren/ui'
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
  const [isDragging, setIsDragging] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [state, setState] = React.useState<UploadState>('idle')
  const [message, setMessage] = React.useState('PDF, DOCX, TXT up to 20MB')
  const [currentDocumentId, setCurrentDocumentId] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (!currentDocumentId || state !== 'processing') return

    const timer = window.setInterval(async () => {
      const status = await getKbDocumentStatus(currentDocumentId)
      if (status === 'ready') {
        setState('ready')
        setMessage('Upload complete. Document is indexed and ready.')
        window.clearInterval(timer)
      } else if (status === 'error') {
        setState('error')
        setMessage('Upload finished, but processing failed.')
        window.clearInterval(timer)
      }
    }, 2000)

    return () => window.clearInterval(timer)
  }, [currentDocumentId, state])

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
    setMessage(`Uploading ${file.name}…`)

    try {
      const document = await uploadKbDocument(file, collectionId, setProgress)
      onUploaded?.(document)
      setCurrentDocumentId(document.id)
      setState(document.status === 'ready' ? 'ready' : 'processing')
      setMessage(
        document.status === 'ready'
          ? 'Upload complete. Document is indexed and ready.'
          : 'Upload complete. Processing document…'
      )
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Upload failed.')
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
          <h3 className="text-sm font-semibold">Upload a knowledge base document</h3>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          <p className="text-xs text-muted-foreground">or drag and drop here</p>
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
            {state === 'processing' ? 'Polling status every 2 seconds…' : `${progress}% uploaded`}
          </p>
        </div>
      )}
    </div>
  )
}
