import { Link } from 'react-router'
import { useReminderCount } from '../lib/reminders'
import { t } from '../i18n'
import { Icon } from './icons'

export function ReminderBadge({ className = '' }: { className?: string }) {
  const { total, overdue } = useReminderCount()
  if (!total) return null
  return (
    <span
      title={t('reminders.label', { count: total })}
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-5 font-semibold text-white tabular-nums ${
        overdue ? 'bg-red-600' : 'bg-amber-600'
      } ${className}`}
    >
      <span aria-hidden="true">{total > 99 ? '99+' : total}</span>
      <span className="sr-only">{t('reminders.label', { count: total })}</span>
    </span>
  )
}

/** Phone top bar: a shortcut straight to what needs doing, only when something does. */
export function ReminderShortcut() {
  const { total, overdue } = useReminderCount()
  if (!total) return null
  return (
    <Link
      to={overdue ? '/tasks?due=overdue' : '/tasks?due=today'}
      className="flex items-center gap-1 rounded p-1 text-slate-600 hover:bg-slate-100"
    >
      <Icon name="tasks" />
      <ReminderBadge />
    </Link>
  )
}
