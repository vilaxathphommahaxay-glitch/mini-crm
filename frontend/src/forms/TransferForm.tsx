import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useUsers } from '../api/hooks'
import type { User } from '../api/types'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Field, FormError, Select } from '../components/ui/form'
import { Modal } from '../components/ui/Modal'

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
      toast.success(
        `Moved to ${name}: ${moved.contacts} contacts, ${moved.companies} companies, ` +
          `${moved.deals} deals, ${moved.activities} activities`,
      )
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
      <p className="text-sm text-slate-600">
        Every contact, company, deal and activity owned by <strong>{from.name}</strong> will be
        given to the person you choose. Use this when someone leaves or changes role.
      </p>
      <Field label="Give everything to" required>
        {(c) => (
          <Select {...c} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">— Choose a user —</option>
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
          Cancel
        </Button>
        <Button onClick={transfer} disabled={!to} loading={busy}>
          Transfer records
        </Button>
      </div>
    </div>
  )
}

export function TransferModal({ from, onClose }: { from: User | null; onClose: () => void }) {
  return (
    <Modal open={from !== null} title={`Transfer ${from?.name ?? ''}'s records`} onClose={onClose}>
      {from && <TransferForm from={from} onClose={onClose} />}
    </Modal>
  )
}
