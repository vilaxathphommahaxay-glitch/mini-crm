import { useState } from 'react'
import { Link } from 'react-router'
import { QUIET_DAYS, useQuietContacts } from '../api/hooks'
import { ActivityFormModal } from '../forms/ActivityForm'
import { t } from '../i18n'
import { addDaysISO, formatDate } from '../lib/format'
import { telLink, whatsappLink } from '../lib/phone'
import { Icon } from './icons'
import { Button } from './ui/Button'
import { buttonClass } from './ui/buttonClass'
import { Card, CardHeader } from './ui/layout'
import { EmptyState, ErrorState, LoadingState } from './ui/states'

/** Dashboard: customers nobody has been in touch with lately, with one tap to reach them. */
export function QuietContactsCard({ ownerId }: { ownerId?: number }) {
  const [showAll, setShowAll] = useState(false)
  const quiet = useQuietContacts(ownerId, showAll)
  const [planning, setPlanning] = useState<number | null>(null)

  return (
    <Card>
      <CardHeader
        title={t('quiet.title', { days: QUIET_DAYS, count: quiet.data?.count ?? 0 })}
        actions={
          quiet.data && quiet.data.count > quiet.data.items.length ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {t('common.seeAll')}
            </button>
          ) : showAll && quiet.data && quiet.data.count > 10 ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {t('dashboard.showFewer')}
            </button>
          ) : undefined
        }
      />
      {quiet.isPending ? (
        <LoadingState />
      ) : quiet.isError ? (
        <ErrorState error={quiet.error} onRetry={() => quiet.refetch()} />
      ) : quiet.data.items.length === 0 ? (
        <EmptyState title={t('quiet.none')} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {quiet.data.items.map((contact) => {
            const whatsapp = whatsappLink(contact.phone)
            return (
              <li
                key={contact.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/contacts/${contact.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {contact.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {contact.company && `${contact.company.name} · `}
                    {contact.last_contact_at
                      ? t('quiet.last', { date: formatDate(contact.last_contact_at) })
                      : t('quiet.never')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {contact.phone && (
                    <a
                      href={telLink(contact.phone)}
                      className={buttonClass('secondary', 'sm')}
                      aria-label={`${t('common.call')} ${contact.name}`}
                    >
                      <Icon name="phone" className="size-3.5" />
                    </a>
                  )}
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonClass('secondary', 'sm', 'text-green-700')}
                      aria-label={`${t('common.whatsapp')} ${contact.name}`}
                    >
                      <Icon name="chat" className="size-3.5" />
                    </a>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setPlanning(contact.id)}>
                    {t('dashboard.addTask')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <ActivityFormModal
        open={planning !== null}
        defaultType="task"
        defaultDueDate={addDaysISO(1)}
        contactId={planning ?? undefined}
        onClose={() => setPlanning(null)}
      />
    </Card>
  )
}
