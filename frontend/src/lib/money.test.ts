import { describe, expect, it } from 'vitest'
import { asTyped, fromCents, lineCents, quoteTotals, toCents } from './money'

describe('toCents / fromCents', () => {
  it.each([
    ['1,500,000', 150000000n],
    ['99.5', 9950n],
    ['0.01', 1n],
    [' 12 ', 1200n],
  ])('%s', (input, cents) => {
    expect(toCents(input)).toBe(cents)
  })

  it.each([[''], ['-1'], ['1.234'], ['abc'], ['1e5']])('%s is not an amount', (input) => {
    expect(toCents(input)).toBeNull()
  })

  it('formats like the API', () => {
    expect(fromCents(150000050n)).toBe('1500000.50')
    expect(fromCents(5n)).toBe('0.05')
    expect(fromCents(-250n)).toBe('-2.50')
  })

  it('stays exact beyond floating point', () => {
    expect(fromCents(toCents('9999999999999999.99')!)).toBe('9999999999999999.99')
  })
})

describe('quote totals (same numbers as the backend tests)', () => {
  it('rounds each line half up', () => {
    expect(lineCents(toCents('2.5')!, toCents('0.01')!)).toBe(3n) // 0.025 -> 0.03
  })

  it('applies discount, then tax', () => {
    const totals = quoteTotals(
      [
        { quantity: '3', unit_price: '150000' },
        { quantity: '1', unit_price: '25000.50' },
      ],
      '5000.50',
      '10',
    )
    expect(fromCents(totals.subtotal)).toBe('475000.50')
    expect(fromCents(totals.tax)).toBe('47000.00')
    expect(fromCents(totals.total)).toBe('517000.00')
  })

  it('ignores lines that are still being typed', () => {
    const totals = quoteTotals([{ quantity: '2', unit_price: '' }], '', '')
    expect(totals.total).toBe(0n)
  })
})

describe('asTyped', () => {
  it.each([
    ['1500000.00', '1500000'],
    ['2.50', '2.5'],
    ['0.00', '0'],
    ['100', '100'],
    ['10.05', '10.05'],
  ])('%s -> %s', (input, expected) => {
    expect(asTyped(input)).toBe(expected)
  })
})
