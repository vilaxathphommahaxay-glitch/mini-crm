import { describe, expect, it } from 'vitest'
import type { Deal, Stage } from '../api/types'
import {
  beforeIdOf,
  cardId,
  columnId,
  dropSlot,
  hasMoved,
  keyboardMove,
  moveCard,
  reorderWithin,
  sumTotals,
  toColumns,
} from './kanban'

function deal(id: number, stage: Stage, value = '100.00', currency: Deal['currency'] = 'LAK') {
  return { id, stage, value, currency, title: `D${id}` } as Deal
}

function board(spec: Partial<Record<Stage, number[]>>) {
  return toColumns(
    Object.entries(spec).map(([stage, ids]) => ({
      stage: stage as Stage,
      count: ids.length,
      totals: [],
      deals: ids.map((id) => deal(id, stage as Stage)),
    })),
  )
}

const ids = (deals: Deal[]) => deals.map((d) => d.id)

describe('kanban moves', () => {
  it('dropping on a card inserts before it in another column', () => {
    const cols = board({ lead: [1, 2], qualified: [3, 4] })

    const next = moveCard(cols, 1, dropSlot(cols, cardId(4))!)

    expect(ids(next.lead)).toEqual([2])
    expect(ids(next.qualified)).toEqual([3, 1, 4])
    expect(next.qualified[1].stage).toBe('qualified')
    expect(beforeIdOf(next, 1)).toBe(4)
  })

  it('dropping on a column appends at the end (before_id null)', () => {
    const cols = board({ lead: [1], won: [5] })

    const next = moveCard(cols, 1, dropSlot(cols, columnId('won'))!)

    expect(ids(next.won)).toEqual([5, 1])
    expect(beforeIdOf(next, 1)).toBeNull()
  })

  it('works on an empty column', () => {
    const cols = board({ lead: [1] })

    const next = moveCard(cols, 1, dropSlot(cols, columnId('lost'))!)

    expect(ids(next.lost)).toEqual([1])
    expect(ids(next.lead)).toEqual([])
  })

  it('reorders within a column like arrayMove', () => {
    const cols = board({ lead: [1, 2, 3] })

    expect(ids(reorderWithin(cols, 'lead', 0, 2).lead)).toEqual([2, 3, 1])
    expect(ids(reorderWithin(cols, 'lead', 2, 0).lead)).toEqual([3, 1, 2])
    expect(beforeIdOf(reorderWithin(cols, 'lead', 2, 0), 3)).toBe(1)
  })

  it('detects a drop back where the card started', () => {
    const cols = board({ lead: [1, 2] })

    expect(hasMoved(cols, cols, 1)).toBe(false)
    expect(hasMoved(cols, reorderWithin(cols, 'lead', 0, 1), 1)).toBe(true)
  })

  it('does not mutate the input', () => {
    const cols = board({ lead: [1, 2], qualified: [] })
    moveCard(cols, 1, { stage: 'qualified', index: 0 })
    expect(ids(cols.lead)).toEqual([1, 2])
  })
})

describe('sumTotals', () => {
  it('sums per currency exactly, never across currencies', () => {
    const totals = sumTotals([
      deal(1, 'lead', '0.10'),
      deal(2, 'lead', '0.20'),
      deal(3, 'lead', '9999999999999999.99'),
      deal(4, 'lead', '5.5', 'USD'),
    ])

    expect(totals).toEqual([
      { currency: 'LAK', amount: '10000000000000000.29' },
      { currency: 'USD', amount: '5.50' },
    ])
  })
})

describe('keyboardMove', () => {
  it('moves to the neighbouring stage at the same row (clamped)', () => {
    const cols = board({ lead: [1, 2, 3], qualified: [4] })

    const next = keyboardMove(cols, 3, 'ArrowRight')!

    expect(ids(next.qualified)).toEqual([4, 3])
    expect(ids(next.lead)).toEqual([1, 2])
  })

  it('reorders with up/down and stops at the edges', () => {
    const cols = board({ lead: [1, 2] })

    expect(ids(keyboardMove(cols, 2, 'ArrowUp')!.lead)).toEqual([2, 1])
    expect(keyboardMove(cols, 1, 'ArrowUp')).toBeNull()
    expect(keyboardMove(cols, 2, 'ArrowDown')).toBeNull()
    expect(keyboardMove(cols, 1, 'ArrowLeft')).toBeNull() // lead is the first stage
  })
})
