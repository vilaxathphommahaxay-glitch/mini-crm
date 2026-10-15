import { ExportButton } from '../../components/ExportButton'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { ImportResult } from '../../api/types'
import { useToast } from '../../components/toast/context'
import { Button } from '../../components/ui/Button'
import { FormError } from '../../components/ui/form'
import { Modal } from '../../components/ui/Modal'
import { t, type MessageKey } from '../../i18n'
import { saveBlob } from '../../lib/download'

const COLUMNS = 'first_name,last_name,email,phone,company,tags,notes'
const TEMPLATE = `﻿${COLUMNS}\r\nSomchai,Vongsa,somchai@example.la,+856 20 5555 1234,Mekong Trading,vip;wholesale,Met at trade fair\r\n`

type Filters = Record<string, string>

const CSV_FIELDS: Record<string, MessageKey> = {
  first_name: 'f.firstName',
  last_name: 'f.lastName',
  email: 'f.email',
  phone: 'f.phone',
  company: 'f.company',
  tags: 'f.tags',
  notes: 'f.notes',
}

/** One skipped row's reason, in the user's language. */
function rowErrorText(e: ImportResult['errors'][number]): string {
  if (e.code === 'duplicate_email') return t('csv.duplicate', { email: e.value ?? '' })
  const field = e.field && CSV_FIELDS[e.field] ? t(CSV_FIELDS[e.field]) : (e.field ?? '')
  const key =
    e.reason === 'required'
      ? 'csv.invalidRequired'
      : e.reason === 'too_long'
        ? 'csv.invalidTooLong'
        : 'csv.invalidInvalid'
  return t(key, { field })
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function runImport() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const outcome = await api<ImportResult>('/contacts/import', { method: 'POST', body: form })
      setResult(outcome)
      if (outcome.created) toast.success(t('csv.importedToast', { count: outcome.created }))
      await Promise.all(
        ['contacts', 'companies', 'tags'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            [t('csv.imported'), result.created, 'text-green-700'],
            [
              t('csv.skipped'),
              result.skipped,
              result.skipped ? 'text-amber-700' : 'text-slate-900',
            ],
            [t('csv.newCompanies'), result.companies_created, 'text-slate-900'],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-md border border-slate-200 p-3">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
        {result.errors.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t('csv.skippedRows')}</p>
            <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 text-sm">
              {result.errors.map((e) => (
                <li key={e.row} className="flex gap-3 px-3 py-2">
                  <span className="shrink-0 font-medium text-slate-500 tabular-nums">
                    {t('csv.row', { n: e.row })}
                  </span>
                  <span className="text-slate-700">{rowErrorText(e)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>{t('common.done')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-sm text-slate-600">
      <FormError message={error} />
      <ul className="list-disc space-y-1 pl-5">
        <li>
          {t('csv.columns')} <code className="text-xs text-slate-800">{COLUMNS}</code>
        </li>
        <li>{t('csv.required', { field: 'first_name' })}</li>
        <li>{t('csv.tags', { example: 'vip;wholesale' })}</li>
        <li>{t('csv.companies')}</li>
        <li>{t('csv.limits')}</li>
      </ul>
      <button
        type="button"
        className="text-indigo-600 hover:underline"
        onClick={() =>
          saveBlob(new Blob([TEMPLATE], { type: 'text/csv' }), 'contacts-template.csv')
        }
      >
        {t('csv.template')}
      </button>
      <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          aria-label={t('csv.fileAria')}
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="secondary" onClick={() => input.current?.click()}>
          {t('csv.chooseFile')}
        </Button>
        <p className="mt-2 text-xs text-slate-500">{file ? file.name : t('csv.noFile')}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={runImport} disabled={!file} loading={busy}>
          {t('csv.importButton')}
        </Button>
      </div>
    </div>
  )
}

/** Export (respecting the current filters) and Import buttons for the contacts list. */
export function ContactsImportExport({ filters }: { filters: Filters }) {
  const [importing, setImporting] = useState(false)

  return (
    <>
      <ExportButton path="/contacts/export" query={filters} fallbackName="contacts.csv" />
      <Button variant="secondary" onClick={() => setImporting(true)}>
        {t('csv.import')}
      </Button>
      <Modal open={importing} title={t('csv.dialogTitle')} onClose={() => setImporting(false)}>
        <ImportDialog onClose={() => setImporting(false)} />
      </Modal>
    </>
  )
}
