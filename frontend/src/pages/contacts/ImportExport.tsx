import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { ImportResult } from '../../api/types'
import { useToast } from '../../components/toast/context'
import { Button } from '../../components/ui/Button'
import { FormError } from '../../components/ui/form'
import { Modal } from '../../components/ui/Modal'
import { filenameFrom, saveBlob } from '../../lib/download'

const COLUMNS = 'first_name,last_name,email,phone,company,tags,notes'
const TEMPLATE = `﻿${COLUMNS}\r\nSomchai,Vongsa,somchai@example.la,+856 20 5555 1234,Mekong Trading,vip;wholesale,Met at trade fair\r\n`

type Filters = Record<string, string>

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
      if (outcome.created) toast.success(`Imported ${outcome.created} contact(s)`)
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
            ['Imported', result.created, 'text-green-700'],
            ['Skipped', result.skipped, result.skipped ? 'text-amber-700' : 'text-slate-900'],
            ['New companies', result.companies_created, 'text-slate-900'],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-md border border-slate-200 p-3">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
        {result.errors.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Rows that were skipped</p>
            <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 text-sm">
              {result.errors.map((e) => (
                <li key={e.row} className="flex gap-3 px-3 py-2">
                  <span className="shrink-0 font-medium text-slate-500 tabular-nums">
                    Row {e.row}
                  </span>
                  <span className="text-slate-700">{e.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-sm text-slate-600">
      <FormError message={error} />
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Columns: <code className="text-xs text-slate-800">{COLUMNS}</code> (only{' '}
          <code className="text-xs">first_name</code> is required)
        </li>
        <li>
          Separate tags with <code className="text-xs">;</code> — e.g.{' '}
          <code className="text-xs">vip;wholesale</code>
        </li>
        <li>Companies are matched by name; unknown names become new companies.</li>
        <li>Rows with an email you already have are skipped. Max 1,000 rows / 1 MB, UTF-8.</li>
      </ul>
      <button
        type="button"
        className="text-indigo-600 hover:underline"
        onClick={() =>
          saveBlob(new Blob([TEMPLATE], { type: 'text/csv' }), 'contacts-template.csv')
        }
      >
        Download a template
      </button>
      <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="secondary" onClick={() => input.current?.click()}>
          Choose CSV file
        </Button>
        <p className="mt-2 text-xs text-slate-500">{file ? file.name : 'No file chosen'}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={runImport} disabled={!file} loading={busy}>
          Import
        </Button>
      </div>
    </div>
  )
}

/** Export (respecting the current filters) and Import buttons for the contacts list. */
export function ContactsImportExport({ filters }: { filters: Filters }) {
  const toast = useToast()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function runExport() {
    setExporting(true)
    try {
      const response = await api<Response>('/contacts/export', { query: filters, raw: true })
      const name = filenameFrom(response.headers.get('Content-Disposition'), 'contacts.csv')
      saveBlob(await response.blob(), name)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={runExport} loading={exporting}>
        Export CSV
      </Button>
      <Button variant="secondary" onClick={() => setImporting(true)}>
        Import CSV
      </Button>
      <Modal open={importing} title="Import contacts from CSV" onClose={() => setImporting(false)}>
        <ImportDialog onClose={() => setImporting(false)} />
      </Modal>
    </>
  )
}
