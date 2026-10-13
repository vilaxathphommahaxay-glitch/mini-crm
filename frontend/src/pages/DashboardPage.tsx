import { Link } from 'react-router'
import { useDashboard } from '../api/hooks'
import { STAGE_LABELS } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { ActivityList } from '../components/ActivityList'
import { StageBadge } from '../components/badges'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { WonChart } from '../components/WonChart'
import { OwnerSelect } from '../forms/selects'
import { formatMoney } from '../lib/format'
import { toId, useUrlFilters } from '../lib/hooks'

function StatTile({
  label,
  value,
  to,
  tone = 'slate',
}: {
  label: string
  value: number
  to: string
  tone?: 'slate' | 'red' | 'amber'
}) {
  const color = { slate: 'text-slate-900', red: 'text-red-600', amber: 'text-amber-700' }[tone]
  return (
    <Link
      to={to}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300"
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
    </Link>
  )
}

export function DashboardPage() {
  const user = useCurrentUser()
  const isAdmin = user.role === 'admin'
  const { values, set } = useUrlFilters(['owner_id'] as const)
  const summary = useDashboard(toId(values.owner_id))

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name.split(' ')[0]}`}
        actions={
          isAdmin && (
            <div className="w-48">
              <OwnerSelect
                aria-label="Filter by owner"
                emptyLabel="All owners"
                value={values.owner_id}
                onChange={(e) => set({ owner_id: e.target.value })}
              />
            </div>
          )
        }
      />

      {summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Due today"
              value={summary.data.tasks.today}
              to="/tasks?due=today"
              tone={summary.data.tasks.today ? 'amber' : 'slate'}
            />
            <StatTile
              label="Overdue"
              value={summary.data.tasks.overdue}
              to="/tasks?due=overdue"
              tone={summary.data.tasks.overdue ? 'red' : 'slate'}
            />
            <StatTile
              label="Coming up (7 days)"
              value={summary.data.tasks.upcoming}
              to="/tasks?due=upcoming"
            />
            <StatTile label="Open deals" value={summary.data.open_deals} to="/pipeline" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
            <Card>
              <CardHeader title="Won revenue by month" />
              <div className="p-4">
                <WonChart months={summary.data.won_by_month} />
              </div>
            </Card>

            <Card className="self-start">
              <CardHeader
                title="Pipeline"
                actions={
                  <Link
                    to="/pipeline"
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Open board
                  </Link>
                }
              />
              <table className="w-full text-sm">
                <caption className="sr-only">Deals per stage</caption>
                <tbody className="divide-y divide-slate-100">
                  {summary.data.pipeline.map((row) => (
                    <tr key={row.stage}>
                      <th scope="row" className="px-4 py-2.5 text-left font-normal">
                        <StageBadge stage={row.stage} />
                        <span className="sr-only">{STAGE_LABELS[row.stage]}</span>
                      </th>
                      <td className="px-2 py-2.5 text-right text-slate-500 tabular-nums">
                        {row.count}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-900 tabular-nums">
                        {row.totals.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          row.totals.map((t) => (
                            <div key={t.currency} className="whitespace-nowrap">
                              {formatMoney(t.amount, t.currency)}
                            </div>
                          ))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Overdue tasks"
              actions={
                <Link
                  to="/tasks?due=overdue"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  See all
                </Link>
              }
            />
            {summary.data.tasks.overdue_items.length === 0 ? (
              <EmptyState title="Nothing overdue">You're all caught up.</EmptyState>
            ) : (
              <ActivityList activities={summary.data.tasks.overdue_items} />
            )}
          </Card>
        </div>
      )}
    </>
  )
}
