import type { Currency, CurrencyTotal } from '../api/types'
import { t } from '../i18n'

const DECIMALS: Record<Currency, number> = { LAK: 0, THB: 2, USD: 2 }

/** "1500000.00" -> "1,500,000 LAK". Works on the string so large amounts stay exact. */
export function formatMoney(amount: string, currency: Currency): string {
  const negative = amount.startsWith('-')
  const [whole, fraction = ''] = amount.replace('-', '').split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const digits = DECIMALS[currency]
  const decimals = digits ? `.${fraction.padEnd(digits, '0').slice(0, digits)}` : ''
  return `${negative ? '-' : ''}${grouped}${decimals} ${t(`currency.${currency}`)}`
}

export function formatTotals(totals: CurrencyTotal[]): string {
  return totals.length ? totals.map((t) => formatMoney(t.amount, t.currency)).join(' · ') : '—'
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-14" or an ISO datetime -> "14/10/2026" (datetimes in the browser's timezone). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local date as "YYYY-MM-DD", for <input type="date"> defaults. */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local date `days` from today as "YYYY-MM-DD". */
export function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
