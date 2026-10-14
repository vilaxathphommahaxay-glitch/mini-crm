import { useState } from 'react'
import { useUsers } from '../api/hooks'
import type { User } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { Icon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Badge, Card, PageHeader } from '../components/ui/layout'
import { Pagination } from '../components/ui/Pagination'
import { ErrorState, LoadingState } from '../components/ui/states'
import { TransferModal } from '../forms/TransferForm'
import { UserFormModal } from '../forms/UserForm'
import { formatDate } from '../lib/format'
import { useUrlFilters } from '../lib/hooks'
import { t } from '../i18n'

const PAGE_SIZE = 20

export function UsersPage() {
  const me = useCurrentUser()
  const { page, set } = useUrlFilters([] as const)
  const query = useUsers({ page, size: PAGE_SIZE })
  const [form, setForm] = useState<{ user?: User } | null>(null)
  const [transferFrom, setTransferFrom] = useState<User | null>(null)

  return (
    <>
      <PageHeader
        title={t('nav.users')}
        subtitle={t('users.subtitle')}
        actions={
          <Button onClick={() => setForm({})}>
            <Icon name="plus" className="size-4" />
            {t('userForm.new')}
          </Button>
        }
      />
      <Card>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">{t('f.name')}</th>
                  <th className="px-4 py-2.5">{t('f.email')}</th>
                  <th className="px-4 py-2.5">{t('f.role')}</th>
                  <th className="px-4 py-2.5">{t('users.status')}</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">{t('users.created')}</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">{t('users.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.name}
                      {user.id === me.id && (
                        <span className="ml-2 text-xs text-slate-400">{t('users.you')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge color={user.role === 'admin' ? 'indigo' : 'slate'}>
                        {t(user.role === 'admin' ? 'role.admin' : 'role.staff')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={user.is_active ? 'green' : 'red'}>
                        {t(user.is_active ? 'users.active' : 'users.disabled')}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setTransferFrom(user)}>
                          {t('transfer.action')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setForm({ user })}>
                          {t('common.edit')}
                        </Button>
                      </div>
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
      <TransferModal from={transferFrom} onClose={() => setTransferFrom(null)} />
    </>
  )
}
