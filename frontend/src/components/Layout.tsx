import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth, useCurrentUser } from '../auth/context'
import { t, type MessageKey } from '../i18n'
import { CommandPalette } from './CommandPalette'
import { LanguageSwitch } from './LanguageSwitch'
import { useReminderTitleAndAppBadge } from '../lib/reminders'
import { ReminderBadge, ReminderShortcut } from './Reminders'
import { Icon, type IconName } from './icons'
import { LoadingState } from './ui/states'

interface NavItem {
  to: string
  label: MessageKey
  icon: IconName
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: 'dashboard' },
  { to: '/contacts', label: 'nav.contacts', icon: 'contacts' },
  { to: '/companies', label: 'nav.companies', icon: 'companies' },
  { to: '/pipeline', label: 'nav.pipeline', icon: 'pipeline' },
  { to: '/tasks', label: 'nav.tasks', icon: 'tasks' },
  { to: '/users', label: 'nav.users', icon: 'users', adminOnly: true },
  { to: '/settings', label: 'nav.settings', icon: 'settings' },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const SHORTCUT = isMac ? '⌘K' : 'Ctrl K'

function Sidebar({ onNavigate, onSearch }: { onNavigate?: () => void; onSearch: () => void }) {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const items = NAV.filter((item) => !item.adminOnly || user.role === 'admin')

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-md bg-indigo-500 text-sm font-bold text-white">
          C
        </span>
        <span className="text-base font-semibold text-white">Mini CRM</span>
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex w-full items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-white"
        >
          <Icon name="search" className="size-4" />
          <span className="flex-1 text-left">{t('nav.search')}</span>
          <kbd className="text-xs text-slate-500">{SHORTCUT}</kbd>
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label={t('nav.main')}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} />
            <span className="flex-1">{t(item.label)}</span>
            {item.to === '/tasks' && <ReminderBadge />}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-400">
          {user.email} · {t(user.role === 'admin' ? 'role.admin' : 'role.staff')}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <Icon name="logout" className="size-4" />
          {t('nav.logout')}
        </button>
        <div className="mt-3">
          <LanguageSwitch />
        </div>
      </div>
    </div>
  )
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  useReminderTitleAndAppBadge()

  // Ctrl+K / ⌘K opens the quick search from anywhere
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const openSearch = () => {
    setMenuOpen(false)
    setSearchOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <Sidebar onSearch={openSearch} />
      </aside>

      {/* mobile / tablet: top bar + drawer */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-label={t('nav.openMenu')}
          onClick={() => setMenuOpen(true)}
          className="rounded p-1 text-slate-600 hover:bg-slate-100"
        >
          <Icon name="menu" />
        </button>
        <span className="flex-1 font-semibold text-slate-900">Mini CRM</span>
        <ReminderShortcut />
        <button
          type="button"
          aria-label={t('common.search')}
          onClick={openSearch}
          className="rounded p-1 text-slate-600 hover:bg-slate-100"
        >
          <Icon name="search" />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <Sidebar onNavigate={() => setMenuOpen(false)} onSearch={openSearch} />
          </aside>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">
        {/* pages load lazily; keep the sidebar on screen while they do */}
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
