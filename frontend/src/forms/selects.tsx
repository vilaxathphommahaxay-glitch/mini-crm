// Option lists for relation fields. Small businesses have few rows, so the first 100 is enough.
//
// Each select renders a disabled placeholder until its options arrive, then a *new* <select>
// (different key). react-hook-form writes the field's value into a newly attached element, so
// the saved choice shows up correctly instead of falling back to the first option.
import type { ComponentProps, ReactNode } from 'react'
import { useCompanies, useContacts, useDeals, useUsers } from '../api/hooks'
import { STAGE_LABELS } from '../api/types'
import { Select } from '../components/ui/form'

type SelectProps = ComponentProps<'select'>

const ALL = { size: 100 }

function AsyncSelect({
  loading,
  empty,
  children,
  ...props
}: SelectProps & { loading: boolean; empty: string; children: ReactNode }) {
  if (loading) {
    return (
      <Select key="loading" id={props.id} disabled>
        <option>Loading…</option>
      </Select>
    )
  }
  return (
    <Select key="ready" {...props}>
      <option value="">{empty}</option>
      {children}
    </Select>
  )
}

export function CompanySelect(props: SelectProps) {
  const { data, isPending } = useCompanies(ALL)
  return (
    <AsyncSelect {...props} loading={isPending} empty="— No company —">
      {data?.items.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </AsyncSelect>
  )
}

export function ContactSelect(props: SelectProps) {
  const { data, isPending } = useContacts(ALL)
  return (
    <AsyncSelect {...props} loading={isPending} empty="— Choose a contact —">
      {data?.items.map((c) => (
        <option key={c.id} value={c.id}>
          {c.full_name}
          {c.company ? ` (${c.company.name})` : ''}
        </option>
      ))}
    </AsyncSelect>
  )
}

export function DealSelect({ contactId, ...props }: SelectProps & { contactId?: string }) {
  const { data, isPending } = useDeals({ ...ALL, contact_id: contactId || undefined })
  return (
    <AsyncSelect {...props} loading={isPending} empty="— No deal —">
      {data?.items.map((d) => (
        <option key={d.id} value={d.id}>
          {d.title} · {STAGE_LABELS[d.stage]}
        </option>
      ))}
    </AsyncSelect>
  )
}

/** Admin-only: assign to (or filter by) any active user. */
export function OwnerSelect({
  emptyLabel = '— Me —',
  ...props
}: SelectProps & { emptyLabel?: string }) {
  const { data, isPending } = useUsers({ ...ALL, is_active: true })
  return (
    <AsyncSelect {...props} loading={isPending} empty={emptyLabel}>
      {data?.items.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </AsyncSelect>
  )
}
