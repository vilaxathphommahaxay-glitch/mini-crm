import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { moveDeal, useActivities, useDeal } from '../api/hooks'
import { STAGE_LABELS, STAGES, type Stage } from '../api/types'
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
      toast.success(`Moved to ${STAGE_LABELS[stage]}`)
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
              Pipeline
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
              Open board
            </ButtonLink>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-6 self-start">
          <Card>
            <div className="space-y-3 p-4">
              <p className="text-sm text-slate-500">Value</p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                {formatMoney(d.value, d.currency)}
              </p>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">Stage</span>
                <Select
                  value={d.stage}
                  disabled={moving}
                  onChange={(e) => changeStage(e.target.value as Stage)}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </Card>
          <Card>
            <CardHeader title="Details" />
            <DetailList
              items={[
                {
                  label: 'Contact',
                  value: (
                    <Link to={`/contacts/${d.contact.id}`} className="hover:text-indigo-600">
                      {d.contact.name}
                    </Link>
                  ),
                },
                {
                  label: 'Company',
                  value: d.company && (
                    <Link to={`/companies/${d.company.id}`} className="hover:text-indigo-600">
                      {d.company.name}
                    </Link>
                  ),
                },
                { label: 'Expected close', value: formatDate(d.expected_close_date) },
                ...(d.closed_at ? [{ label: 'Closed', value: formatDateTime(d.closed_at) }] : []),
                ...(isAdmin ? [{ label: 'Owner', value: d.owner.name }] : []),
                { label: 'Created', value: formatDate(d.created_at) },
              ]}
            />
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader
            title="Activity"
            actions={
              <Button size="sm" onClick={() => setLogging(true)}>
                <Icon name="plus" className="size-3.5" />
                Log activity
              </Button>
            }
          />
          {timeline.isPending ? (
            <LoadingState />
          ) : timeline.isError ? (
            <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />
          ) : timeline.data.items.length === 0 ? (
            <EmptyState title="No activity on this deal yet">
              Log calls, meetings and next steps here.
            </EmptyState>
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
