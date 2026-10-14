import { useEffect } from 'react'
import { useReminders } from '../api/hooks'

const APP_TITLE = 'Mini CRM'

/** Open tasks of mine that are overdue or due today; 0 while loading or on error. */
export function useReminderCount() {
  const { data } = useReminders()
  return { total: data ? data.overdue + data.today : 0, overdue: data?.overdue ?? 0 }
}

/**
 * Shows the count outside the page too: in the browser tab title, and on the app icon when the
 * CRM is installed on a phone or desktop (where the browser supports it).
 */
export function useReminderTitleAndAppBadge() {
  const { total } = useReminderCount()
  useEffect(() => {
    document.title = total ? `(${total}) ${APP_TITLE}` : APP_TITLE
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    const badge = total ? nav.setAppBadge?.(total) : nav.clearAppBadge?.()
    badge?.catch(() => {}) // not allowed here (e.g. not installed) - the title still shows it
  }, [total])
  // signed out: nothing should keep nagging
  useEffect(
    () => () => {
      document.title = APP_TITLE
      ;(navigator as Navigator & { clearAppBadge?: () => Promise<void> })
        .clearAppBadge?.()
        .catch(() => {})
    },
    [],
  )
}
