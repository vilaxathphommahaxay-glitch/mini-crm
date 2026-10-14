import { useState } from 'react'
import { Link } from 'react-router'
import { useHistory } from '../api/hooks'
import type { HistoryEntity, HistoryEvent } from '../api/types'
import { t } from '../i18n'
import { formatDateTime } from '../lib/format'
import { changeLines, headline } from '../lib/historyText'
import { Card, CardHeader } from './ui/layout'
import { EmptyState, ErrorState, LoadingState } from './ui/states'

/** Where an entry's record lives, while it still exists. */
function recordLink(event: HistoryEvent): string | null {
  if (event.action === 'deleted') return null
  switch (event.entity_type) {
    case 'company':
      return `/companies/${event.entity_id}`
    case 'contact':
      return `/contacts/${event.entity_id}`
    case 'deal':
      return `/deals/${event.entity_id}`
    case 'quote':
      return `/quotes/${event.entity_id}`
    default:
      return null
  }
}

export function HistoryList({
  events,
  links = false,
}: {
  events: HistoryEvent[]
  links?: boolean
}) {
  return (
    <ol className="divide-y divide-slate-100">
      {events.map((event) => {
        const to = links ? recordLink(event) : null
        const lines = changeLines(event)
        return (
          <li key={event.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <p className="min-w-0 text-slate-900">
                {to ? (
                  <Link to={to} className="hover:text-indigo-600">
                    {headline(event)}
                  </Link>
                ) : (
                  headline(event)
                )}
              </p>
              <time dateTime={event.created_at} className="text-xs text-slate-500 tabular-nums">
                {formatDateTime(event.created_at)}
              </time>
            </div>
            {lines.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs break-words text-slate-600">
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** A record's history at the bottom of its page, loaded only when someone asks for it. */
export function HistoryCard({ type, id }: { type: HistoryEntity; id: number }) {
  const [open, setOpen] = useState(false)
  const history = useHistory({ entity_type: type, entity_id: id, size: 50 }, open)
  return (
    <Card>
      <CardHeader
        title={t('history.title')}
        actions={
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            {t(open ? 'history.hide' : 'history.show')}
          </button>
        }
      />
      {open &&
        (history.isPending ? (
          <LoadingState />
        ) : history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} />
        ) : history.data.items.length === 0 ? (
          <EmptyState title={t('history.empty')}>{t('history.emptyHint')}</EmptyState>
        ) : (
          <HistoryList events={history.data.items} />
        ))}
    </Card>
  )
}
