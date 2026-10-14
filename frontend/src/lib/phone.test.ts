import { describe, expect, it } from 'vitest'
import { telLink, whatsappLink, whatsappNumber } from './phone'

describe('whatsappNumber', () => {
  it.each([
    ['+856 20 5555 1234', '8562055551234'],
    ['020 5555 1234', '8562055551234'],
    ['020-5555-1234', '8562055551234'],
    ['20 5555 1234', '8562055551234'],
    ['8562055551234', '8562055551234'],
    ['00 66 81 234 5678', '66812345678'],
    ['+66 81 234 5678', '66812345678'],
  ])('%s -> %s', (input, expected) => {
    expect(whatsappNumber(input)).toBe(expected)
  })

  it.each([[''], [null], ['ask at the shop'], ['123']])('%s is not a phone number', (input) => {
    expect(whatsappNumber(input)).toBeNull()
  })

  it('builds wa.me links', () => {
    expect(whatsappLink('020 5555 1234')).toBe('https://wa.me/8562055551234')
    expect(whatsappLink('')).toBeNull()
  })
})

describe('telLink', () => {
  it('keeps + and digits', () => {
    expect(telLink('+856 20 5555-1234')).toBe('tel:+8562055551234')
    expect(telLink('020 5555 1234')).toBe('tel:02055551234')
  })
})
