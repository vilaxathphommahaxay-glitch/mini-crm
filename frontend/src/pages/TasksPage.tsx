import { useState } from 'react'
import { useActivities, useDashboard } from '../api/hooks'
import type { Due } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { ActivityList } from '../components/ActivityList'
import { Icon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Card, PageHeader } from '../components/ui/layout'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { ActivityFormModal } from '../forms/ActivityForm'
import { OwnerSelect } from '../forms/selects'
import { todayISO } from '../lib/format'
import { toId, useUrlFilters } from '../lib/hooks'

const TABS: { due: Due; label: string; empty: string }[] = [
  { due: 'today', label: 'Today', empty: 'Nothing due today' },
  { due: 'overdue', label: 'Overdue', empty: 'Nothing overdue — nice work' },
  { due: 'upcoming', label: 'Next 7 days', empty: 'Nothing coming up this week' },
]
const PAGE_SIZE = 25

export function TasksPage() {
  const isAdmin = useCurrentUser().role === 'admin'
  const { values, page, set } = useUrlFilters(['due', 'owner_id'] as const)
  const tab = TABS.find((t) => t.due === values.due) ?? TABS[0]
  const ownerId = toId(values.owner_id)
  const [creating, setCreating] = useState(false)

  const list = useActivities({ due: tab.due, owner_id: ownerId, page, size: PAGE_SIZE })
  const counts = useDashboard(ownerId).data?.tasks

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Open activities with a due date. Tick one to mark it done."
        actions={
          <>
            {isAdmin && (
              <div className="w-48">
                <OwnerSelect
                  aria-label="Filter by owner"
                  emptyLabel="All owners"
                  value={values.owner_id}
                  onChange={(e) => set({ owner_id: e.target.value })}
                />
              </div>
            )}
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" className="size-4" />
              New task
            </Button>
          </>
        }
      />
      <Card>
        <div role="tablist" aria-label="Due" className="flex gap-1 border-b border-slate-200 px-2">
          {TABS.map((t) => {
            const active = t.due === tab.due
            const count = counts?.[t.due]
            return (
              <button
                key={t.due}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => set({ due: t.due })}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${
                  active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
                {count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      t.due === 'overdue' && count > 0
                        ? 'bg-red-50 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div role="tabpanel">
          {list.isPending ? (
            <LoadingState />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : list.data.items.length === 0 ? (
            <EmptyState title={tab.empty} />
          ) : (
            <ActivityList activities={list.data.items} />
          )}
        </div>
        {list.data && (
          <Pagination
            page={page}
            size={PAGE_SIZE}
            total={list.data.total}
            onPageChange={(p) => set({ page: p })}
          />
        )}
      </Card>
      <ActivityFormModal
        open={creating}
        defaultDueDate={todayISO()}
        onClose={() => setCreating(false)}
      />
    </>
  )
}
