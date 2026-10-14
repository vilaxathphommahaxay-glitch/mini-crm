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
import { t, type MessageKey } from '../i18n'

const TABS: { due: Due; label: MessageKey; empty: MessageKey }[] = [
  { due: 'today', label: 'tasks.today', empty: 'tasks.emptyToday' },
  { due: 'overdue', label: 'tasks.overdue', empty: 'tasks.emptyOverdue' },
  { due: 'upcoming', label: 'tasks.upcoming', empty: 'tasks.emptyUpcoming' },
]
const PAGE_SIZE = 25

export function TasksPage() {
  const isAdmin = useCurrentUser().role === 'admin'
  const { values, page, set } = useUrlFilters(['due', 'owner_id'] as const)
  const tab = TABS.find((item) => item.due === values.due) ?? TABS[0]
  const ownerId = toId(values.owner_id)
  const [creating, setCreating] = useState(false)

  const list = useActivities({ due: tab.due, owner_id: ownerId, page, size: PAGE_SIZE })
  const counts = useDashboard(ownerId).data?.tasks

  return (
    <>
      <PageHeader
        title={t('nav.tasks')}
        subtitle={t('tasks.subtitle')}
        actions={
          <>
            {isAdmin && (
              <div className="w-48">
                <OwnerSelect
                  aria-label={t('common.filterOwner')}
                  emptyLabel={t('select.allOwners')}
                  value={values.owner_id}
                  onChange={(e) => set({ owner_id: e.target.value })}
                />
              </div>
            )}
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" className="size-4" />
              {t('tasks.new')}
            </Button>
          </>
        }
      />
      <Card>
        <div
          role="tablist"
          aria-label={t('tasks.due')}
          className="flex gap-1 border-b border-slate-200 px-2"
        >
          {TABS.map((item) => {
            const active = item.due === tab.due
            const count = counts?.[item.due]
            return (
              <button
                key={item.due}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => set({ due: item.due })}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${
                  active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t(item.label)}
                {count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      item.due === 'overdue' && count > 0
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
            <EmptyState title={t(tab.empty)} />
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
