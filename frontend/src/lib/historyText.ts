// Turns an edit-history entry into sentences in the user's language.
import type { HistoryChange, HistoryEvent } from '../api/types'
import { t, type MessageKey } from '../i18n'
import { formatDate } from './format'

const FIELD_LABELS: Record<string, MessageKey> = {
  first_name: 'f.firstName',
  last_name: 'f.lastName',
  email: 'f.email',
  phone: 'f.phone',
  company_id: 'f.company',
  contact_id: 'f.contact',
  deal_id: 'f.deal',
  owner_id: 'f.owner',
  notes: 'f.notes',
  tags: 'f.tags',
  name: 'f.name',
  website: 'f.website',
  address: 'f.address',
  title: 'f.title',
  value: 'f.value',
  currency: 'f.currency',
  stage: 'f.stage',
  expected_close_date: 'f.expectedClose',
  type: 'f.type',
  subject: 'f.subject',
  description: 'f.details',
  due_date: 'f.dueDate',
  done: 'f.done',
  issue_date: 'quote.issueDate',
  valid_until: 'quote.validUntil',
  discount: 'quote.discount',
  tax_rate: 'quote.taxRate',
}

const LONG_TEXT = 80

export function fieldLabel(field: string): string {
  const key = FIELD_LABELS[field]
  return key ? t(key) : field
}

/** One side of a change as a person would read it. */
export function valueText(change: HistoryChange, side: 'from' | 'to'): string {
  const label = change[`${side}_label`]
  if (typeof label === 'string') return label
  const value = change[side]
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return t(value ? 'history.yes' : 'history.no')
  const text = String(value)
  switch (change.field) {
    case 'stage':
      return t(`stage.${text}` as MessageKey)
    case 'currency':
      return t(`currency.${text}` as MessageKey)
    case 'type':
      return t(`activity.${text}` as MessageKey)
    case 'value':
    case 'discount':
      return text.replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDate(text)
  return text.length > LONG_TEXT ? `${text.slice(0, LONG_TEXT)}…` : text
}

/** "Somchai changed contact “Noy”" */
export function headline(event: HistoryEvent): string {
  const actor = event.actor?.name ?? t('history.someone')
  const what = `${t(`history.entity.${event.entity_type}` as MessageKey)} “${event.entity_label}”`
  if (event.action === 'transferred') {
    const owner = event.changes?.find((c) => c.field === 'owner_id')
    return t('history.transferred', {
      actor,
      what: `“${event.entity_label}”`,
      to: owner?.to_label ?? '—',
    })
  }
  return t(`history.${event.action}` as MessageKey, { actor, what })
}

/** The detail lines under the headline: "Phone: 020 1111 → 020 2222". */
export function changeLines(event: HistoryEvent): string[] {
  return (event.changes ?? []).map((change) => {
    if (change.field === 'items') return t('history.itemsChanged')
    if (change.field === 'counts') {
      const n = (key: string) => Number(change[key] ?? 0)
      return t('history.counts', {
        companies: n('companies'),
        contacts: n('contacts'),
        deals: n('deals'),
        activities: n('activities'),
      })
    }
    if (change.field === 'tags') {
      const parts = []
      if (change.added?.length)
        parts.push(t('history.tagsAdded', { tags: change.added.join(', ') }))
      if (change.removed?.length) {
        parts.push(t('history.tagsRemoved', { tags: change.removed.join(', ') }))
      }
      return `${fieldLabel('tags')}: ${parts.join('; ')}`
    }
    return `${fieldLabel(change.field)}: ${valueText(change, 'from')} → ${valueText(change, 'to')}`
  })
}
