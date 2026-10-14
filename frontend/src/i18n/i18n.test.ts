import { afterEach, describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { apiErrorText } from '../api/errorText'
import { formatMoney } from '../lib/format'
import { en } from './en'
import { lo } from './lo'
import { msg, setLocale, t, tr, translate, type MessageKey } from './core'

afterEach(() => setLocale('en'))

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  const keys = Object.keys(en) as MessageKey[]

  it('Lao has exactly the English keys', () => {
    expect(Object.keys(lo).sort()).toEqual([...keys].sort())
  })

  it('no text is empty', () => {
    for (const key of keys) {
      expect(en[key].trim(), `en ${key}`).not.toBe('')
      expect(lo[key].trim(), `lo ${key}`).not.toBe('')
    }
  })

  it('both languages use the same {placeholders}', () => {
    for (const key of keys) {
      expect(placeholders(lo[key]), key).toEqual(placeholders(en[key]))
    }
  })

  it('Lao text is really Lao (not an English copy)', () => {
    const hasLao = (text: string) => /[຀-໿]/.test(text)
    // brand names, symbols and units that stay as they are
    const allowedSame = new Set(['common.range'])
    const untranslated = keys.filter((k) => !hasLao(lo[k]) && !allowedSame.has(k))
    expect(untranslated).toEqual([])
  })
})

describe('translate', () => {
  it('fills in values', () => {
    expect(translate('en', 'common.range', { from: 1, to: 20, total: 31 })).toBe('1–20 of 31')
    expect(translate('lo', 'common.range', { from: 1, to: 20, total: 31 })).toBe(
      '1–20 ຈາກທັງໝົດ 31',
    )
  })

  it('uses the singular form for 1 in English only where one exists', () => {
    expect(translate('en', 'contacts.count', { count: 1 })).toBe('1 contact')
    expect(translate('en', 'contacts.count', { count: 5 })).toBe('5 contacts')
    expect(translate('lo', 'contacts.count', { count: 1 })).toBe(
      translate('lo', 'contacts.count', { count: 5 }).replace('5', '1'),
    )
  })

  it('t() follows the current language', () => {
    expect(t('nav.dashboard')).toBe('Dashboard')
    setLocale('lo')
    expect(t('nav.dashboard')).toBe(lo['nav.dashboard'])
  })

  it('translates form messages made with msg() and leaves other text alone', () => {
    expect(tr(msg('validation.maxChars', 100))).toBe('At most 100 characters')
    setLocale('lo')
    expect(tr(msg('validation.maxChars', 100))).toBe('ບໍ່ເກີນ 100 ຕົວອັກສອນ')
    expect(tr('Some text from the server')).toBe('Some text from the server')
  })
})

describe('server errors', () => {
  it('are shown in the current language by their code', () => {
    const wrong = new ApiError(401, 'invalid_credentials', 'Incorrect email or password')
    expect(apiErrorText(wrong)).toBe('Incorrect email or password')
    setLocale('lo')
    expect(apiErrorText(wrong)).toBe(lo['error.invalidCredentials'])
  })

  it('fill in numbers from the details', () => {
    setLocale('lo')
    const company = new ApiError(409, 'has_related_records', 'x', [{ contacts: 2, deals: 1 }])
    expect(apiErrorText(company)).toContain('2')
    expect(apiErrorText(company)).toContain('1')
    const wait = new ApiError(429, 'too_many_attempts', 'x', [{ minutes: 7 }])
    expect(apiErrorText(wait)).toContain('7')
  })

  it('fall back to the server message for unknown codes', () => {
    setLocale('lo')
    expect(apiErrorText(new ApiError(418, 'teapot', 'I am a teapot'))).toBe('I am a teapot')
  })
})

describe('money', () => {
  it('names the currency in the current language', () => {
    expect(formatMoney('1500000.00', 'LAK')).toBe('1,500,000 LAK')
    setLocale('lo')
    expect(formatMoney('1500000.00', 'LAK')).toBe('1,500,000 ກີບ')
    expect(formatMoney('99', 'USD')).toBe('99.00 ໂດລາ')
  })
})
