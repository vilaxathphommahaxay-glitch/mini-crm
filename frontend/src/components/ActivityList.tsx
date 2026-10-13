import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../api/client'
import { useDeleteActivity, useSaveActivity } from '../api/hooks'
import type { Activity } from '../api/types'
import { ActivityFormModal } from '../forms/ActivityForm'
import { formatDate, formatDateTime, todayISO } from '../lib/format'
import { ActivityBadge } from './badges'
import { useToast } from './toast/context'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/Modal'

function DueLabel({ activity }: { activity: Activity }) {
  if (!activity.due_date) return null
  const today = todayISO()
  const late = !activity.done && activity.due_date < today
  const isToday = activity.due_date === today
  const color = activity.done
    ? 'text-slate-400'
    : late
      ? 'font-medium text-red-600'
      : isToday
        ? 'font-medium text-amber-700'
        : 'text-slate-600'
  return (
    <span className={`text-xs ${color}`}>
      Due {formatDate(activity.due_date)}
      {late && ' · overdue'}
      {isToday && !activity.done && ' · today'}
    </span>
  )
}

interface Props {
  activities: Activity[]
  /** show which contact/deal each item belongs to (off on a contact's own timeline) */
  showLinks?: boolean
}

export function ActivityList({ activities, showLinks = true }: Props) {
  const save = useSaveActivity()
  const remove = useDeleteActivity()
  const toast = useToast()
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleting, setDeleting] = useState<Activity | null>(null)
  // Ticks show instantly; the override is dropped once the refetched list has the real value.
  const [pendingDone, setPendingDone] = useState<Record<number, boolean>>({})
  const isDone = (a: Activity) => pendingDone[a.id] ?? a.done

  async function toggleDone(activity: Activity) {
    const done = !isDone(activity)
    setPendingDone((p) => ({ ...p, [activity.id]: done }))
    try {
      // resolves after the list has been refetched (see useSave)
      await save.mutateAsync({ id: activity.id, body: { done } })
      toast.success(done ? 'Marked as done' : 'Marked as not done')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setPendingDone((p) => {
        const next = { ...p }
        delete next[activity.id]
        return next
      })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Activity deleted')
      setDeleting(null)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {activities.map((activity) => {
          const done = isDone(activity)
          return (
            <li key={activity.id} className="flex gap-3 px-4 py-3">
              <input
                type="checkbox"
                aria-label={`Done: ${activity.subject}`}
                checked={done}
                onChange={() => toggleDone(activity)}
                className="mt-1 size-4 shrink-0 rounded border-slate-300"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ActivityBadge type={activity.type} />
                  <span
                    className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                  >
                    {activity.subject}
                  </span>
                </div>
                {activity.description && (
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-600">
                    {activity.description}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <DueLabel activity={activity} />
                  {showLinks && activity.contact && (
                    <Link className="hover:text-indigo-600" to={`/contacts/${activity.contact.id}`}>
                      {activity.contact.name}
                    </Link>
                  )}
                  {activity.deal && <span>Deal: {activity.deal.title}</span>}
                  <span>
                    {activity.owner.name} · {formatDateTime(activity.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(activity)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(activity)}>
                  Delete
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <ActivityFormModal
        open={editing !== null}
        activity={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete activity?"
        message={`“${deleting?.subject}” will be removed permanently.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
