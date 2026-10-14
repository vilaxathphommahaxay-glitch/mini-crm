// Option lists for relation fields. Small businesses have few rows, so the first 100 is enough.
//
// Each select renders a disabled placeholder until its options arrive, then a *new* <select>
// (different key). react-hook-form writes the field's value into a newly attached element, so
// the saved choice shows up correctly instead of falling back to the first option.
import type { ComponentProps, ReactNode } from 'react'
import { useCompanies, useContacts, useDeals, useUsers } from '../api/hooks'
import type { Ref } from '../api/types'
import { Select } from '../components/ui/form'
import { t } from '../i18n'
import { NEW_COMPANY } from './schemas'

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
        <option>{t('common.loading')}</option>
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

export function CompanySelect({
  allowCreate = false,
  ...props
}: SelectProps & { allowCreate?: boolean }) {
  const { data, isPending } = useCompanies(ALL)
  return (
    <AsyncSelect {...props} loading={isPending} empty={t('select.noCompany')}>
      {data?.items.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      {allowCreate && <option value={NEW_COMPANY}>{t('select.newCompany')}</option>}
    </AsyncSelect>
  )
}

export function ContactSelect(props: SelectProps) {
  const { data, isPending } = useContacts(ALL)
  return (
    <AsyncSelect {...props} loading={isPending} empty={t('select.chooseContact')}>
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
    <AsyncSelect {...props} loading={isPending} empty={t('select.noDeal')}>
      {data?.items.map((d) => (
        <option key={d.id} value={d.id}>
          {d.title} · {t(`stage.${d.stage}`)}
        </option>
      ))}
    </AsyncSelect>
  )
}

/**
 * Admin-only: assign to (or filter by) any active user. `current` is the record's owner,
 * listed even if their account has since been disabled, so the form shows the real value.
 */
export function OwnerSelect({
  emptyLabel = t('select.me'),
  current,
  ...props
}: SelectProps & { emptyLabel?: string; current?: Ref }) {
  const { data, isPending } = useUsers({ ...ALL, is_active: true })
  const missing = current && data && !data.items.some((u) => u.id === current.id)
  return (
    <AsyncSelect {...props} loading={isPending} empty={emptyLabel}>
      {missing && (
        <option value={current.id}>{t('select.disabledOwner', { name: current.name })}</option>
      )}
      {data?.items.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </AsyncSelect>
  )
}
