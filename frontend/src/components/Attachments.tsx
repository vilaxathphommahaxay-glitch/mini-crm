import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { errorMessage } from '../api/client'
import {
  fetchAttachment,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from '../api/hooks'
import type { Attachment, AttachmentEntity } from '../api/types'
import { t } from '../i18n'
import { saveBlob } from '../lib/download'
import { formatDate, formatSize } from '../lib/format'
import { Icon } from './icons'
import { useToast } from './toast/context'
import { Button } from './ui/Button'
import { buttonClass } from './ui/buttonClass'
import { Card, CardHeader } from './ui/layout'
import { ConfirmDialog, Modal } from './ui/Modal'
import { EmptyState, ErrorState, LoadingState } from './ui/states'

/** Same as the server's MAX_UPLOAD_MB default; checked here only to fail fast on a phone. */
const MAX_MB = 10
const ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.heic,' +
  'application/pdf,application/zip,text/plain,text/csv'
const PREVIEWABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** An attachment's bytes as an object URL, released again when no longer shown. */
function useObjectUrl(id: number, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    let objectUrl: string | null = null
    let cancelled = false
    fetchAttachment(id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {}) // the file icon stays; opening it shows the error
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, enabled])
  return url
}

function Thumbnail({ file }: { file: Attachment }) {
  const isImage = PREVIEWABLE.has(file.content_type)
  const url = useObjectUrl(file.id, isImage)
  if (isImage && url) {
    return <img src={url} alt="" className="size-12 shrink-0 rounded object-cover" />
  }
  const ext = file.filename.split('.').pop()?.slice(0, 4).toUpperCase() ?? ''
  return (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500"
    >
      {ext}
    </span>
  )
}

function Preview({ file, onClose }: { file: Attachment; onClose: () => void }) {
  const url = useObjectUrl(file.id, true)
  return (
    <Modal
      open
      size="lg"
      title={file.filename}
      onClose={onClose}
      footer={
        url && (
          <a href={url} download={file.filename} className={buttonClass('secondary')}>
            {t('files.download')}
          </a>
        )
      }
    >
      {url ? (
        <img src={url} alt={file.filename} className="mx-auto max-h-[70vh] rounded" />
      ) : (
        <LoadingState />
      )}
    </Modal>
  )
}

/** Photos, contracts and receipts kept on a contact, company or deal. */
export function AttachmentsCard({ type, id }: { type: AttachmentEntity; id: number }) {
  const toast = useToast()
  const files = useAttachments(type, id)
  const upload = useUploadAttachment(type, id)
  const remove = useDeleteAttachment()
  const input = useRef<HTMLInputElement>(null)
  const [previewing, setPreviewing] = useState<Attachment | null>(null)
  const [deleting, setDeleting] = useState<Attachment | null>(null)

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])]
    event.target.value = '' // picking the same file again should work too
    let added = 0
    for (const file of picked) {
      if (file.size > MAX_MB * 1_000_000) {
        toast.error(t('files.tooLarge', { name: file.name, mb: MAX_MB }))
        continue
      }
      try {
        await upload.mutateAsync(file)
        added += 1
      } catch (error) {
        toast.error(`${file.name}: ${errorMessage(error)}`)
      }
    }
    if (added) toast.success(t('files.uploaded', { count: added }))
  }

  async function open(file: Attachment) {
    if (PREVIEWABLE.has(file.content_type)) {
      setPreviewing(file)
      return
    }
    try {
      saveBlob(await fetchAttachment(file.id), file.filename)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(t('files.deleted'))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader
        title={t('files.title')}
        actions={
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-label={t('files.add')}
              onChange={onPick}
            />
            <Button
              size="sm"
              variant="secondary"
              loading={upload.isPending}
              onClick={() => input.current?.click()}
            >
              {!upload.isPending && <Icon name="plus" className="size-3.5" />}
              {upload.isPending ? t('files.uploading') : t('files.add')}
            </Button>
          </>
        }
      />
      {files.isPending ? (
        <LoadingState />
      ) : files.isError ? (
        <ErrorState error={files.error} onRetry={() => files.refetch()} />
      ) : files.data.length === 0 ? (
        <EmptyState title={t('files.none')}>{t('files.noneHint', { mb: MAX_MB })}</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {files.data.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-4 py-2.5">
              <Thumbnail file={file} />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => open(file)}
                  aria-label={t('files.open', { name: file.filename })}
                  className="block max-w-full truncate text-left text-sm font-medium text-slate-900 hover:text-indigo-600"
                >
                  {file.filename}
                </button>
                <p className="text-xs text-slate-500">
                  {formatSize(file.size)} · {file.uploaded_by.name} · {formatDate(file.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('files.delete', { name: file.filename })}
                title={t('files.delete', { name: file.filename })}
                onClick={() => setDeleting(file)}
              >
                <Icon name="trash" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {previewing && <Preview file={previewing} onClose={() => setPreviewing(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        title={t('files.deleteTitle')}
        message={t('files.deleteMessage', { name: deleting?.filename ?? '' })}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  )
}
