import { useTeam } from '../api/hooks'
import type { CurrencyTotal } from '../api/types'
import { t } from '../i18n'
import { formatMoney } from '../lib/format'
import { Card, CardHeader } from './ui/layout'
import { ErrorState, LoadingState } from './ui/states'

function Amounts({ totals }: { totals: CurrencyTotal[] }) {
  if (!totals.length) return <span className="text-slate-400">—</span>
  return (
    <>
      {totals.map((total) => (
        <div key={total.currency} className="whitespace-nowrap">
          {formatMoney(total.amount, total.currency)}
        </div>
      ))}
    </>
  )
}

/** Admin overview: one row per salesperson. Clicking a name filters the dashboard to them. */
export function TeamTable({ onSelect }: { onSelect: (userId: number) => void }) {
  const team = useTeam(true)
  return (
    <Card>
      <CardHeader title={t('team.title')} />
      {team.isPending ? (
        <LoadingState />
      ) : team.isError ? (
        <ErrorState error={team.error} onRetry={() => team.refetch()} />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">{t('team.person')}</th>
                <th className="px-4 py-2.5 text-right">{t('team.openDeals')}</th>
                <th className="px-4 py-2.5 text-right">{t('team.openValue')}</th>
                <th className="px-4 py-2.5 text-right">{t('team.wonThisMonth')}</th>
                <th className="px-4 py-2.5 text-right">{t('team.overdueTasks')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.data.map((row) => (
                <tr key={row.user.id} className="align-top">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(row.user.id)}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {row.user.name}
                    </button>
                    {!row.is_active && (
                      <span className="ml-2 text-xs text-red-600">{t('team.disabled')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.open_deals}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <Amounts totals={row.open_value} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.won_this_month > 0 ? (
                      <Amounts totals={row.won_value} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${row.overdue_tasks ? 'font-medium text-red-600' : ''}`}
                  >
                    {row.overdue_tasks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
