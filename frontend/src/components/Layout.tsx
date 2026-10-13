import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth, useCurrentUser } from '../auth/context'
import { Icon, type IconName } from './icons'

interface NavItem {
  to: string
  label: string
  icon: IconName
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/contacts', label: 'Contacts', icon: 'contacts' },
  { to: '/companies', label: 'Companies', icon: 'companies' },
  { to: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/users', label: 'Users', icon: 'users', adminOnly: true },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
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
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
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
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-400">
          {user.email} · {user.role === 'admin' ? 'Admin' : 'Staff'}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <Icon name="logout" className="size-4" />
          Log out
        </button>
      </div>
    </div>
  )
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <Sidebar />
      </aside>

      {/* mobile / tablet: top bar + drawer */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="rounded p-1 text-slate-600 hover:bg-slate-100"
        >
          <Icon name="menu" />
        </button>
        <span className="font-semibold text-slate-900">Mini CRM</span>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
