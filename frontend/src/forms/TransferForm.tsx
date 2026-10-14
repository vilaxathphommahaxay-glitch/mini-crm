import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useUsers } from '../api/hooks'
import type { User } from '../api/types'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Field, FormError, Select } from '../components/ui/form'
import { Modal } from '../components/ui/Modal'
import { t } from '../i18n'

interface Moved {
  companies: number
  contacts: number
  deals: number
  activities: number
}

function TransferForm({ from, onClose }: { from: User; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const users = useUsers({ size: 100, is_active: true })
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = users.data?.items.filter((u) => u.id !== from.id) ?? []

  async function transfer() {
    setBusy(true)
    setError(null)
    try {
      const moved = await api<Moved>(`/users/${from.id}/transfer`, {
        method: 'POST',
        body: { to_user_id: Number(to) },
      })
      const name = candidates.find((u) => String(u.id) === to)?.name
      toast.success(t('transfer.done', { name: name ?? '', ...moved }))
      await queryClient.invalidateQueries() // ownership changed everywhere
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <p className="text-sm text-slate-600">{t('transfer.intro', { name: from.name })}</p>
      <Field label={t('transfer.giveTo')} required>
        {(c) => (
          <Select {...c} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">{t('transfer.choose')}</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={transfer} disabled={!to} loading={busy}>
          {t('transfer.action')}
        </Button>
      </div>
    </div>
  )
}

export function TransferModal({ from, onClose }: { from: User | null; onClose: () => void }) {
  return (
    <Modal
      open={from !== null}
      title={t('transfer.title', { name: from?.name ?? '' })}
      onClose={onClose}
    >
      {from && <TransferForm from={from} onClose={onClose} />}
    </Modal>
  )
}
