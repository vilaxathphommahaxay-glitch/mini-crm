import { useSyncExternalStore } from 'react'
import { getLocale, subscribe, type Locale } from './core'

export { LOCALES, getLocale, msg, setLocale, t, tr } from './core'
export type { Locale, MessageKey, Params } from './core'

/** Current language; the component re-renders when it changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, getLocale)
}
