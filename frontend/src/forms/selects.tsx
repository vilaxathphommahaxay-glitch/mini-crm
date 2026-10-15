// Option lists for relation fields. Up to 100 options are listed; when there are more (a shop
// with many customers), a search box appears above the list to find the rest.
//
// Each select renders a disabled placeholder until its options arrive, then a *new* <select>
// (different key). react-hook-form writes the field's value into a newly attached element, so
// the saved choice shows up correctly instead of falling back to the first option.
import { useEffect, useState, type ChangeEvent, type ComponentProps, type ReactNode } from 'react'
import { useCompanies, useContacts, useDeals, useUsers } from '../api/hooks'
import type { Ref } from '../api/types'
import { Input, Select } from '../components/ui/form'
import { t } from '../i18n'
import { NEW_COMPANY } from './schemas'

type SelectProps = ComponentProps<'select'>

const ALL = { size: 100 }
const SEARCH_DELAY_MS = 250

/**
 * Search state for a long option list. `chosen` remembers the picked option, so it stays in the
 * list (and on screen) when a later search no longer matches it.
 */
function useOptionSearch(initial: Ref | null | undefined) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Ref | null>(initial ?? null)
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text])
  function track(event: ChangeEvent<HTMLSelectElement>) {
    const option = event.target.selectedOptions[0]
    const id = Number(event.target.value)
    setChosen(Number.isInteger(id) && id > 0 ? { id, name: option?.text ?? '' } : null)
  }
  // once a list turns out to be too long for one screen, the search box stays
  const [searchable, setSearchable] = useState(false)
  function showSearchIf(tooMany: boolean) {
    if (tooMany && !searchable) setSearchable(true)
  }
  return { text, setText, query, chosen, track, searchable, showSearchIf }
}

function SearchBox({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Input
      type="search"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mb-2"
      autoComplete="off"
    />
  )
}

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

interface RelationProps extends SelectProps {
  /** the record's current choice, so it shows even when it isn't among the first 100 */
  selected?: Ref | null
}

interface Option {
  id: number
  label: string
}

/**
 * A relation <select> with a search box for long lists. All options, including a picked one that
 * the current search no longer matches, are one keyed list: React then moves the selected
 * <option> instead of replacing it, so the (uncontrolled) select keeps showing the choice.
 */
function RelationSelect({
  selected,
  onChange,
  useOptions,
  searchLabel,
  empty,
  trailing,
  ...props
}: RelationProps & {
  useOptions: (query: string) => { options: Option[]; total: number; loading: boolean }
  searchLabel: string
  empty: string
  trailing?: ReactNode
}) {
  const search = useOptionSearch(selected)
  const { options, total, loading } = useOptions(search.query)
  search.showSearchIf(total > options.length)
  const chosen = search.chosen
  const all =
    chosen && !options.some((o) => o.id === chosen.id)
      ? [{ id: chosen.id, label: chosen.name }, ...options]
      : options
  return (
    <div>
      {search.searchable && (
        <SearchBox label={searchLabel} value={search.text} onChange={search.setText} />
      )}
      <AsyncSelect
        {...props}
        onChange={(e) => {
          search.track(e)
          onChange?.(e)
        }}
        loading={loading}
        empty={empty}
      >
        {all.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        {search.query && options.length === 0 && <option disabled>{t('select.noMatches')}</option>}
        {trailing}
      </AsyncSelect>
    </div>
  )
}

function useCompanyOptions(query: string) {
  const { data, isPending } = useCompanies({ ...ALL, search: query || undefined })
  const options = (data?.items ?? []).map((c) => ({ id: c.id, label: c.name }))
  return { options, total: data?.total ?? 0, loading: isPending }
}

function useContactOptions(query: string) {
  const { data, isPending } = useContacts({ ...ALL, search: query || undefined })
  const options = (data?.items ?? []).map((c) => ({
    id: c.id,
    label: c.company ? `${c.full_name} (${c.company.name})` : c.full_name,
  }))
  return { options, total: data?.total ?? 0, loading: isPending }
}

export function CompanySelect({
  allowCreate = false,
  ...props
}: RelationProps & { allowCreate?: boolean }) {
  return (
    <RelationSelect
      {...props}
      useOptions={useCompanyOptions}
      searchLabel={t('select.findCompany')}
      empty={t('select.noCompany')}
      trailing={allowCreate && <option value={NEW_COMPANY}>{t('select.newCompany')}</option>}
    />
  )
}

export function ContactSelect(props: RelationProps) {
  return (
    <RelationSelect
      {...props}
      useOptions={useContactOptions}
      searchLabel={t('select.findContact')}
      empty={t('select.chooseContact')}
    />
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
