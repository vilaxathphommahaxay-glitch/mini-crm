import { describe, expect, it } from 'vitest'
import type { HistoryEvent } from '../api/types'
import { changeLines, headline } from './historyText'

const base: HistoryEvent = {
  id: 1,
  created_at: '2026-10-14T08:00:00Z',
  actor: { id: 2, name: 'Somchai' },
  entity_type: 'contact',
  entity_id: 7,
  entity_label: 'Noy',
  action: 'updated',
  changes: null,
}

describe('history text', () => {
  it('says who did what to which record', () => {
    expect(headline(base)).toBe('Somchai changed contact “Noy”')
    expect(headline({ ...base, action: 'deleted', actor: null })).toBe(
      'Someone deleted contact “Noy”',
    )
  })

  it('describes each change in words', () => {
    const lines = changeLines({
      ...base,
      changes: [
        { field: 'phone', from: '020 1111', to: '020 2222' },
        { field: 'owner_id', from: 2, to: 3, from_label: 'Somchai', to_label: 'Keo' },
        { field: 'company_id', from: null, to: 4, from_label: null, to_label: 'Dao Coffee' },
        { field: 'stage', from: 'lead', to: 'won' },
        { field: 'value', from: '1500000.00', to: '2000000.50' },
        { field: 'done', from: false, to: true },
        { field: 'due_date', from: '2026-10-01', to: null },
        { field: 'tags', added: ['vip'], removed: ['new'] },
        { field: 'items' },
      ],
    })
    expect(lines).toEqual([
      'Phone: 020 1111 → 020 2222',
      'Owner: Somchai → Keo',
      'Company: — → Dao Coffee',
      'Stage: Lead → Won',
      'Value: 1,500,000 → 2,000,000.50',
      'Done: No → Yes',
      'Due date: 01/10/2026 → —',
      'Tags: added vip; removed new',
      'Products and services were changed',
    ])
  })

  it('describes a hand-over of records', () => {
    const event: HistoryEvent = {
      ...base,
      entity_type: 'user',
      entity_label: 'Somchai',
      action: 'transferred',
      actor: { id: 1, name: 'Admin' },
      changes: [
        { field: 'owner_id', from: 2, to: 3, from_label: 'Somchai', to_label: 'Keo' },
        { field: 'counts', companies: 1, contacts: 5, deals: 2, activities: 9 },
      ],
    }
    expect(headline(event)).toBe('Admin handed everything of “Somchai” to Keo')
    expect(changeLines(event)[1]).toBe('1 companies, 5 contacts, 2 deals, 9 activities')
  })
})
