import type { Deal } from '../api/types'
import { formatDate, formatMoney } from '../lib/format'
import { StageBadge } from './badges'

/** Compact deal list for contact and company pages. */
export function DealsTable({
  deals,
  showContact = false,
  onSelect,
}: {
  deals: Deal[]
  showContact?: boolean
  onSelect?: (deal: Deal) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-2">Deal</th>
            {showContact && <th className="px-4 py-2">Contact</th>}
            <th className="px-4 py-2">Stage</th>
            <th className="px-4 py-2 text-right">Value</th>
            <th className="hidden px-4 py-2 sm:table-cell">Expected close</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deals.map((deal) => (
            <tr
              key={deal.id}
              className={onSelect ? 'cursor-pointer hover:bg-slate-50' : undefined}
              onClick={() => onSelect?.(deal)}
            >
              <td className="px-4 py-2.5 font-medium text-slate-900">{deal.title}</td>
              {showContact && <td className="px-4 py-2.5 text-slate-600">{deal.contact.name}</td>}
              <td className="px-4 py-2.5">
                <StageBadge stage={deal.stage} />
              </td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-900 tabular-nums">
                {formatMoney(deal.value, deal.currency)}
              </td>
              <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
                {formatDate(deal.expected_close_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
