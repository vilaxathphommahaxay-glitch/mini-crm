// Minimal i18n: English is the source of truth (en.ts); every other language must provide
// the same keys (TypeScript enforces it). `t()` works anywhere, inside or outside React.
import { en } from './en'
import { lo } from './lo'

export type Locale = 'en' | 'lo'
export type MessageKey = keyof typeof en
export type Params = Record<string, string | number>

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'lo', label: 'ລາວ' },
]

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, lo }
const STORAGE_KEY = 'crm.locale'

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'lo'
}

/**
 * The language to start in: the user's saved choice, else the team's default (APP_LOCALE,
 * baked in at build time), else the browser's language (Lao browsers get Lao), else English.
 */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* storage blocked: fall through */
  }
  const configured = import.meta.env.VITE_DEFAULT_LOCALE
  if (isLocale(configured)) return configured
  const languages =
    typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  return languages.some((l) => l?.toLowerCase().startsWith('lo')) ? 'lo' : 'en'
}

let current: Locale = detectLocale()
const listeners = new Set<() => void>()

export function getLocale(): Locale {
  return current
}

export function setLocale(locale: Locale) {
  if (locale === current) return
  current = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* the choice just won't survive a reload */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = locale
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function fill(template: string, params?: Params) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/**
 * Translate a key. With `count`, "<key>_one" is used when count is 1 (if it exists),
 * so English can say "1 contact" / "5 contacts" while Lao uses the same text for both.
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const dictionary = DICTIONARIES[locale]
  const one = `${key}_one` as MessageKey
  const useOne = params?.count === 1 && one in dictionary
  return fill(dictionary[useOne ? one : key] ?? en[key] ?? key, params)
}

export function t(key: MessageKey, params?: Params): string {
  return translate(current, key, params)
}

/** Form validation messages travel as "key" or "key|value" strings and are translated on display. */
export function msg(key: MessageKey, value?: string | number): string {
  return value === undefined ? key : `${key}|${value}`
}

/** Translate a validation message made by msg(); anything else (e.g. from the server) is shown as is. */
export function tr(message: string | undefined): string | undefined {
  if (!message) return message
  const [key, value] = message.split('|')
  if (!(key in en)) return message
  return t(key as MessageKey, value === undefined ? undefined : { n: value })
}

if (typeof document !== 'undefined') document.documentElement.lang = current
