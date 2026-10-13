import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CURRENCIES, type Currency, type DashboardSummary } from '../api/types'
import { formatMoney } from '../lib/format'

const BAR_COLOR = '#6366f1' // indigo-500, validated against the white surface
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return `${MONTHS[Number(month) - 1]} ${year.slice(2)}`
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

/** Won revenue per month, one currency at a time (amounts are never mixed). */
export function WonChart({ months }: { months: DashboardSummary['won_by_month'] }) {
  const available = CURRENCIES.filter((c) =>
    months.some((m) => m.totals.some((t) => t.currency === c)),
  )
  const [picked, setPicked] = useState<Currency | null>(null)
  const currency = picked && available.includes(picked) ? picked : (available[0] ?? 'LAK')

  const data = months.map((m) => {
    const total = m.totals.find((t) => t.currency === currency)
    return {
      month: monthLabel(m.month),
      amount: total ? Number(total.amount) : 0, // plotted value only; labels use the exact string
      label: total ? formatMoney(total.amount, currency) : formatMoney('0', currency),
    }
  })

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1" role="group" aria-label="Currency">
        {available.length > 1 &&
          available.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === currency}
              onClick={() => setPicked(c)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                c === currency
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
      </div>
      {available.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">
          No won deals in the last 12 months
        </p>
      ) : (
        <div className="h-64" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval="preserveStartEnd"
              />
              <YAxis
                width={48}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: number) => compact.format(v)}
              />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                formatter={(_value, _name, item) => [item.payload.label, 'Won']}
                contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e2e8f0' }}
                itemStyle={{ color: '#0f172a' }}
                labelStyle={{ color: '#475569' }}
              />
              <Bar dataKey="amount" fill={BAR_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* the same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>Won revenue by month in {currency}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Won</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{row.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
