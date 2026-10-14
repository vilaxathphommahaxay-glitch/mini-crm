import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSearch } from '../api/hooks'
import type { SearchResults } from '../api/types'
import { t } from '../i18n'
import { formatMoney } from '../lib/format'
import { Icon } from './icons'
import { Spinner } from './ui/states'

interface Hit {
  key: string
  group: 'palette.contacts' | 'palette.companies' | 'palette.deals'
  title: string
  subtitle: string
  to: string
}

const GROUPS = ['palette.contacts', 'palette.companies', 'palette.deals'] as const

function toHits(data: SearchResults | undefined): Hit[] {
  if (!data) return []
  return [
    ...data.contacts.map((c) => ({
      key: `contact-${c.id}`,
      group: 'palette.contacts' as const,
      title: c.full_name,
      subtitle: [c.company?.name, c.email].filter(Boolean).join(' · '),
      to: `/contacts/${c.id}`,
    })),
    ...data.companies.map((c) => ({
      key: `company-${c.id}`,
      group: 'palette.companies' as const,
      title: c.name,
      subtitle: c.phone ?? '',
      to: `/companies/${c.id}`,
    })),
    ...data.deals.map((d) => ({
      key: `deal-${d.id}`,
      group: 'palette.deals' as const,
      title: d.title,
      subtitle: `${t(`stage.${d.stage}`)} · ${formatMoney(d.value, d.currency)} · ${d.contact.name}`,
      to: `/deals/${d.id}`,
    })),
  ]
}

/** Mounted only while open, so every opening starts with an empty box. */
function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const listId = useId()
  const [text, setText] = useState('')
  const [query, setQuery] = useState('') // debounced
  const [selection, setSelection] = useState({ query: '', index: 0 })

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 200)
    return () => clearTimeout(timer)
  }, [text])

  const search = useSearch(query)
  const hits = useMemo(() => (query ? toHits(search.data) : []), [query, search.data])
  // the highlight belongs to one query; a new query starts at the top again
  const active = selection.query === query ? Math.min(selection.index, hits.length - 1) : 0
  const optionId = (i: number) => `${listId}-${i}`

  function open(hit: Hit | undefined) {
    if (!hit) return
    onClose()
    navigate(hit.to)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && hits.length) {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setSelection({ query, index: (active + step + hits.length) % hits.length })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      open(hits[active])
    }
  }

  const waiting = text.trim() !== query || (search.isFetching && hits.length === 0)

  let body
  if (!text.trim()) {
    body = <Message>{t('palette.hint')}</Message>
  } else if (search.isError) {
    body = <Message error>{t('palette.failed')}</Message>
  } else if (waiting && hits.length === 0) {
    body = (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  } else if (hits.length === 0) {
    body = <Message>{t('palette.empty', { query })}</Message>
  } else {
    body = (
      <ul
        id={listId}
        role="listbox"
        aria-label={t('palette.results')}
        className="max-h-96 overflow-y-auto py-2"
      >
        {GROUPS.map((group) => {
          const items = hits.filter((h) => h.group === group)
          if (!items.length) return null
          return (
            <li key={group} role="presentation">
              <p className="px-4 pt-2 pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {t(group)}
              </p>
              <ul role="presentation">
                {items.map((hit) => {
                  const index = hits.indexOf(hit)
                  const selected = index === active
                  return (
                    <li
                      key={hit.key}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setSelection({ query, index })}
                      onClick={() => open(hit)}
                      className={`mx-2 cursor-pointer rounded-md px-3 py-2 ${selected ? 'bg-indigo-50' : ''}`}
                    >
                      <p
                        className={`text-sm font-medium ${selected ? 'text-indigo-700' : 'text-slate-900'}`}
                      >
                        {hit.title}
                      </p>
                      {hit.subtitle && (
                        <p className="truncate text-xs text-slate-500">{hit.subtitle}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]">
      <div className="fixed inset-0" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('common.search')}
        className="relative w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Icon name="search" className="size-5 text-slate-400" />
          <input
            autoFocus
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls={listId}
            aria-activedescendant={hits.length ? optionId(active) : undefined}
            aria-label={t('palette.hint')}
            placeholder={t('palette.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-12 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400">
            Esc
          </kbd>
        </div>
        {body}
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {t('palette.keys')}
        </p>
      </div>
    </div>
  )
}

function Message({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p className={`px-4 py-6 text-center text-sm ${error ? 'text-red-600' : 'text-slate-500'}`}>
      {children}
    </p>
  )
}

/** Global quick search, opened with Ctrl+K / ⌘K or the search buttons. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <Palette onClose={onClose} /> : null
}
