import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

/**
 * List filters kept in the URL (?search=…&page=2), so they survive reloads and the back button.
 * Changing any filter other than `page` goes back to page 1.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>
  const page = Math.max(1, Number(params.get('page')) || 1)

  function set(changes: Partial<Record<K | 'page', string | number>>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value === '' || value === undefined || value === null) next.delete(key)
          else next.set(key, String(value))
        }
        if (!('page' in changes)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  return { values, page, set }
}

export const toId = (value: string): number | undefined => (value ? Number(value) : undefined)

/**
 * A search box that updates instantly but commits (e.g. to the URL) only after typing stops.
 *
 * Leaving the box (blur) commits right away and cancels the timer. That ordering matters: when
 * someone types and then clicks a result, the blur happens before the click, so the search is
 * saved first and the click's navigation comes last. A timer left running could fire *after*
 * the click — while the next page is still loading the list page is still mounted — and pull
 * the user back to the list.
 */
export function useDebouncedInput(initial: string, commit: (value: string) => void, delayMs = 300) {
  const [text, setText] = useState(initial)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pending = useRef<string | null>(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  function flush() {
    clearTimeout(timer.current)
    if (pending.current !== null) {
      const value = pending.current
      pending.current = null
      commit(value)
    }
  }

  function onChange(value: string) {
    setText(value)
    pending.current = value.trim()
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, delayMs)
  }
  return [text, onChange, flush] as const
}
