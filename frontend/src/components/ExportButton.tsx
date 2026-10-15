import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { t } from '../i18n'
import { filenameFrom, saveBlob } from '../lib/download'
import { useToast } from './toast/context'
import { Button } from './ui/Button'

type Query = Record<string, string | number | undefined>

/** Downloads a CSV export from the API (with the sign-in token) under the server's file name. */
export function ExportButton({
  path,
  query,
  fallbackName,
}: {
  path: string
  query?: Query
  fallbackName: string
}) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)

  async function run() {
    setExporting(true)
    try {
      const response = await api<Response>(path, { query, raw: true })
      saveBlob(
        await response.blob(),
        filenameFrom(response.headers.get('Content-Disposition'), fallbackName),
      )
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="secondary" onClick={run} loading={exporting}>
      {t('csv.export')}
    </Button>
  )
}
