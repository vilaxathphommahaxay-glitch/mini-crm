import type { ReactNode } from 'react'

export interface DetailItem {
  label: string
  value: ReactNode
}

/** Label/value rows for detail cards. */
export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
          <dt className="text-slate-500">{label}</dt>
          <dd className="col-span-2 break-words text-slate-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
