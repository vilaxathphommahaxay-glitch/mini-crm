import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { moveDeal, useActivities, useDeal, useDealQuotes } from '../api/hooks'
import { STAGES, type Stage } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { ActivityList } from '../components/ActivityList'
import { DetailList } from '../components/DetailList'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button, ButtonLink } from '../components/ui/Button'
import { Select } from '../components/ui/form'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { ActivityFormModal } from '../forms/ActivityForm'
import { DealFormModal } from '../forms/DealForm'
import { formatDate, formatDateTime, formatMoney } from '../lib/format'
import { NotFoundPage } from './NotFoundPage'
import { t } from '../i18n'

export function DealDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const isAdmin = useCurrentUser().role === 'admin'
  const deal = useDeal(id)
  const timeline = useActivities({ deal_id: id, size: 50 })

  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [moving, setMoving] = useState(false)

  if (deal.isPending) return <LoadingState />
  if (deal.error instanceof ApiError && deal.error.status === 404) return <NotFoundPage />
  if (deal.isError) return <ErrorState error={deal.error} onRetry={() => deal.refetch()} />
  const d = deal.data

  async function changeStage(stage: Stage) {
    if (stage === d.stage) return
    setMoving(true)
    try {
      await moveDeal(d.id, stage, null) // end of the new column
      await Promise.all(
        ['deals', 'dashboard'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      )
      toast.success(t('dealPage.movedTo', { stage: t(`stage.${stage}`) }))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={d.title}
        subtitle={
          <>
            <Link to="/pipeline" className="hover:text-indigo-600">
              {t('nav.pipeline')}
            </Link>
            {' · '}
            <Link to={`/contacts/${d.contact.id}`} className="hover:text-indigo-600">
              {d.contact.name}
            </Link>
            {d.company && (
              <>
                {' · '}
                <Link to={`/companies/${d.company.id}`} className="hover:text-indigo-600">
                  {d.company.name}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            <ButtonLink to="/pipeline" variant="secondary">
              {t('dealPage.openBoard')}
            </ButtonLink>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-6 self-start">
          <Card>
            <div className="space-y-3 p-4">
              <p className="text-sm text-slate-500">{t('f.value')}</p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                {formatMoney(d.value, d.currency)}
              </p>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">{t('f.stage')}</span>
                <Select
                  value={d.stage}
                  disabled={moving}
                  onChange={(e) => changeStage(e.target.value as Stage)}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {t(`stage.${s}`)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </Card>
          <Card>
            <CardHeader title={t('common.details')} />
            <DetailList
              items={[
                {
                  label: t('f.contact'),
                  value: (
                    <Link to={`/contacts/${d.contact.id}`} className="hover:text-indigo-600">
                      {d.contact.name}
                    </Link>
                  ),
                },
                {
                  label: t('f.company'),
                  value: d.company && (
                    <Link to={`/companies/${d.company.id}`} className="hover:text-indigo-600">
                      {d.company.name}
                    </Link>
                  ),
                },
                { label: t('f.expectedClose'), value: formatDate(d.expected_close_date) },
                ...(d.closed_at
                  ? [{ label: t('dealPage.closed'), value: formatDateTime(d.closed_at) }]
                  : []),
                ...(isAdmin ? [{ label: t('f.owner'), value: d.owner.name }] : []),
                { label: t('dealPage.created'), value: formatDate(d.created_at) },
              ]}
            />
          </Card>
          <QuotesCard dealId={d.id} />
        </div>

        <Card className="min-w-0">
          <CardHeader
            title={t('act.title')}
            actions={
              <Button size="sm" onClick={() => setLogging(true)}>
                <Icon name="plus" className="size-3.5" />
                {t('act.log')}
              </Button>
            }
          />
          {timeline.isPending ? (
            <LoadingState />
          ) : timeline.isError ? (
            <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />
          ) : timeline.data.items.length === 0 ? (
            <EmptyState title={t('dealPage.noActivity')}>{t('dealPage.noActivityHint')}</EmptyState>
          ) : (
            <ActivityList activities={timeline.data.items} showDeal={false} />
          )}
        </Card>
      </div>

      <DealFormModal
        open={editing}
        deal={d}
        onClose={() => setEditing(false)}
        onDeleted={() => navigate('/pipeline', { replace: true })}
      />
      <ActivityFormModal
        open={logging}
        defaultType="call"
        contactId={d.contact.id}
        dealId={d.id}
        onClose={() => setLogging(false)}
      />
    </>
  )
}

function QuotesCard({ dealId }: { dealId: number }) {
  const quotes = useDealQuotes(dealId)
  return (
    <Card>
      <CardHeader
        title={t('quote.title')}
        actions={
          <ButtonLink to={`/deals/${dealId}/quotes/new`} size="sm" variant="secondary">
            <Icon name="plus" className="size-3.5" />
            {t('quote.new')}
          </ButtonLink>
        }
      />
      {quotes.isPending ? (
        <LoadingState />
      ) : quotes.isError ? (
        <ErrorState error={quotes.error} onRetry={() => quotes.refetch()} />
      ) : quotes.data.length === 0 ? (
        <EmptyState title={t('quote.none')}>{t('quote.noneHint')}</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {quotes.data.map((quote) => (
            <li key={quote.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Icon name="document" className="size-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/quotes/${quote.id}`}
                  className="font-medium text-slate-900 hover:text-indigo-600"
                >
                  {quote.number}
                </Link>
                <p className="text-xs text-slate-500">{formatDate(quote.issue_date)}</p>
              </div>
              <span className="text-right whitespace-nowrap text-slate-900 tabular-nums">
                {formatMoney(quote.total, quote.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
