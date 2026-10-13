// Pure board logic for the pipeline page (no React), so it can be unit tested.
import {
  CURRENCIES,
  STAGES,
  type BoardColumn,
  type Currency,
  type CurrencyTotal,
  type Deal,
  type Stage,
} from '../api/types'

export type Columns = Record<Stage, Deal[]>

export interface Slot {
  stage: Stage
  index: number
}

// dnd-kit ids: cards and columns share one id space
export const cardId = (id: number) => `deal:${id}`
export const columnId = (stage: Stage) => `column:${stage}`

export function parseDndId(
  id: string | number,
): { kind: 'deal'; id: number } | { kind: 'column'; stage: Stage } | null {
  const [kind, value] = String(id).split(':')
  if (kind === 'deal') return { kind, id: Number(value) }
  if (kind === 'column' && (STAGES as string[]).includes(value))
    return { kind, stage: value as Stage }
  return null
}

export function toColumns(board: BoardColumn[] | undefined): Columns {
  const columns = Object.fromEntries(STAGES.map((s) => [s, [] as Deal[]])) as Columns
  for (const column of board ?? []) columns[column.stage] = column.deals
  return columns
}

export function locate(columns: Columns, dealId: number): Slot | null {
  for (const stage of STAGES) {
    const index = columns[stage].findIndex((d) => d.id === dealId)
    if (index !== -1) return { stage, index }
  }
  return null
}

/** Where a card dropped on `overId` should go: before that card, or at the end of a column. */
export function dropSlot(columns: Columns, overId: string | number): Slot | null {
  const over = parseDndId(overId)
  if (!over) return null
  if (over.kind === 'column') return { stage: over.stage, index: columns[over.stage].length }
  return locate(columns, over.id)
}

/** Move a card to `target` (index counted before the card is removed). Returns new columns. */
export function moveCard(columns: Columns, dealId: number, target: Slot): Columns {
  const from = locate(columns, dealId)
  if (!from) return columns
  const deal = { ...columns[from.stage][from.index], stage: target.stage }
  const next = { ...columns, [from.stage]: columns[from.stage].filter((d) => d.id !== dealId) }
  let index = target.index
  if (from.stage === target.stage && from.index < target.index) index -= 1
  const list = [...next[target.stage]]
  list.splice(Math.max(0, Math.min(index, list.length)), 0, deal)
  next[target.stage] = list
  return next
}

/** Same-column reorder with dnd-kit's arrayMove semantics (the card takes the over card's slot). */
export function reorderWithin(columns: Columns, stage: Stage, from: number, to: number): Columns {
  const list = [...columns[stage]]
  const [card] = list.splice(from, 1)
  list.splice(to, 0, card)
  return { ...columns, [stage]: list }
}

/** The API's `before_id` for a card in its current place: the next card, or null at the end. */
export function beforeIdOf(columns: Columns, dealId: number): number | null {
  const slot = locate(columns, dealId)
  if (!slot) return null
  return columns[slot.stage][slot.index + 1]?.id ?? null
}

/** Did the card actually change column or neighbours? */
export function hasMoved(before: Columns, after: Columns, dealId: number): boolean {
  const a = locate(before, dealId)
  const b = locate(after, dealId)
  if (!a || !b) return false
  return a.stage !== b.stage || beforeIdOf(before, dealId) !== beforeIdOf(after, dealId)
}

/** Exact per-currency sums of decimal strings (cents as BigInt, never floats). */
export function sumTotals(deals: Deal[]): CurrencyTotal[] {
  const cents = new Map<Currency, bigint>()
  for (const deal of deals) {
    const [whole, fraction = ''] = deal.value.split('.')
    const value = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
    cents.set(deal.currency, (cents.get(deal.currency) ?? 0n) + value)
  }
  return CURRENCIES.filter((c) => cents.has(c)).map((currency) => {
    const total = cents.get(currency)!
    const amount = `${total / 100n}.${String(total % 100n).padStart(2, '0')}`
    return { currency, amount }
  })
}

/**
 * Keyboard moves for a focused card: ←/→ to the previous/next stage (same row, clamped),
 * ↑/↓ within the column. Returns the new columns, or null when the card can't move that way.
 */
export function keyboardMove(columns: Columns, dealId: number, key: string): Columns | null {
  const from = locate(columns, dealId)
  if (!from) return null
  const length = columns[from.stage].length
  if (key === 'ArrowUp') {
    return from.index > 0 ? reorderWithin(columns, from.stage, from.index, from.index - 1) : null
  }
  if (key === 'ArrowDown') {
    return from.index < length - 1
      ? reorderWithin(columns, from.stage, from.index, from.index + 1)
      : null
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const next = STAGES[STAGES.indexOf(from.stage) + (key === 'ArrowRight' ? 1 : -1)]
    if (!next) return null
    return moveCard(columns, dealId, {
      stage: next,
      index: Math.min(from.index, columns[next].length),
    })
  }
  return null
}
