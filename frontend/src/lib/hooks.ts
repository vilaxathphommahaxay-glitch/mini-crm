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
