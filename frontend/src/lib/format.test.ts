import { describe, expect, it } from 'vitest'
import { buildUrl } from '../api/client'
import { formatDate, formatMoney, formatSize, formatTotals } from './format'

describe('formatMoney', () => {
  it('groups thousands and hides LAK decimals', () => {
    expect(formatMoney('1500000.00', 'LAK')).toBe('1,500,000 LAK')
    // ...unless there really is a fraction, so lines still add up on a quote
    expect(formatMoney('25000.50', 'LAK')).toBe('25,000.50 LAK')
  })

  it('keeps two decimals for THB and USD', () => {
    expect(formatMoney('1234.5', 'USD')).toBe('1,234.50 USD')
    expect(formatMoney('99', 'THB')).toBe('99.00 THB')
  })

  it('stays exact for amounts beyond float precision', () => {
    expect(formatMoney('9999999999999999.99', 'USD')).toBe('9,999,999,999,999,999.99 USD')
  })

  it('joins totals per currency', () => {
    expect(
      formatTotals([
        { currency: 'LAK', amount: '1000.00' },
        { currency: 'USD', amount: '5.00' },
      ]),
    ).toBe('1,000 LAK · 5.00 USD')
    expect(formatTotals([])).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats date-only values without timezone shifts', () => {
    expect(formatDate('2026-03-01')).toBe('01/03/2026')
  })

  it('handles empty values', () => {
    expect(formatDate(null)).toBe('—')
  })
})

describe('buildUrl', () => {
  it('drops empty query values', () => {
    expect(buildUrl('/contacts', { search: '', page: 2, tag: undefined, done: false })).toBe(
      '/api/contacts?page=2&done=false',
    )
  })
})

describe('formatSize', () => {
  it.each([
    [512, '512 B'],
    [2048, '2 KB'],
    [3_400_000, '3.4 MB'],
  ])('%s -> %s', (bytes, text) => {
    expect(formatSize(bytes)).toBe(text)
  })
})
