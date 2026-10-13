import { useState } from 'react'
import { useUsers } from '../api/hooks'
import type { User } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { Icon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Badge, Card, PageHeader } from '../components/ui/layout'
import { Pagination } from '../components/ui/Pagination'
import { ErrorState, LoadingState } from '../components/ui/states'
import { UserFormModal } from '../forms/UserForm'
import { formatDate } from '../lib/format'
import { useUrlFilters } from '../lib/hooks'

const PAGE_SIZE = 20

export function UsersPage() {
  const me = useCurrentUser()
  const { page, set } = useUrlFilters([] as const)
  const query = useUsers({ page, size: PAGE_SIZE })
  const [form, setForm] = useState<{ user?: User } | null>(null)

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Admins see everything; staff only see records they own."
        actions={
          <Button onClick={() => setForm({})}>
            <Icon name="plus" className="size-4" />
            New user
          </Button>
        }
      />
      <Card>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Created</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.name}
                      {user.id === me.id && (
                        <span className="ml-2 text-xs text-slate-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge color={user.role === 'admin' ? 'indigo' : 'slate'}>
                        {user.role === 'admin' ? 'Admin' : 'Staff'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={user.is_active ? 'green' : 'red'}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setForm({ user })}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && (
          <Pagination
            page={page}
            size={PAGE_SIZE}
            total={query.data.total}
            onPageChange={(p) => set({ page: p })}
          />
        )}
      </Card>
      <UserFormModal open={form !== null} user={form?.user} onClose={() => setForm(null)} />
    </>
  )
}
