import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCompanies } from '../api/hooks'
import { useCurrentUser } from '../auth/context'
import { Icon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/form'
import { Card, PageHeader } from '../components/ui/layout'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { CompanyFormModal } from '../forms/CompanyForm'
import { OwnerSelect } from '../forms/selects'
import { formatDate } from '../lib/format'
import { toId, useDebouncedInput, useUrlFilters } from '../lib/hooks'
import { t } from '../i18n'

const PAGE_SIZE = 20

export function CompaniesPage() {
  const isAdmin = useCurrentUser().role === 'admin'
  const navigate = useNavigate()
  const { values, page, set } = useUrlFilters(['search', 'owner_id'] as const)
  const [searchInput, onSearchChange] = useDebouncedInput(values.search, (search) =>
    set({ search }),
  )
  const [creating, setCreating] = useState(false)

  const query = useCompanies({
    search: values.search,
    owner_id: toId(values.owner_id),
    page,
    size: PAGE_SIZE,
  })
  const filtered = Boolean(values.search || values.owner_id)

  return (
    <>
      <PageHeader
        title={t('nav.companies')}
        subtitle={query.data ? t('companies.count', { count: query.data.total }) : undefined}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="size-4" />
            {t('companyForm.new')}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-56 flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400"
            />
            <Input
              aria-label={t('companies.searchLabel')}
              placeholder={t('companies.searchPlaceholder')}
              className="pl-9"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {isAdmin && (
            <div className="w-full sm:w-48">
              <OwnerSelect
                aria-label={t('common.filterOwner')}
                emptyLabel={t('select.allOwners')}
                value={values.owner_id}
                onChange={(e) => set({ owner_id: e.target.value })}
              />
            </div>
          )}
        </div>

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState title={t(filtered ? 'companies.noMatch' : 'companies.none')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">{t('f.name')}</th>
                  <th className="px-4 py-2.5">{t('f.phone')}</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">{t('f.website')}</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">{t('f.address')}</th>
                  {isAdmin && <th className="hidden px-4 py-2.5 lg:table-cell">{t('f.owner')}</th>}
                  <th className="hidden px-4 py-2.5 xl:table-cell">{t('common.updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.items.map((company) => (
                  <tr
                    key={company.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        to={`/companies/${company.id}`}
                        className="hover:text-indigo-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {company.phone ?? '—'}
                    </td>
                    <td className="hidden max-w-56 truncate px-4 py-3 text-slate-600 md:table-cell">
                      {company.website ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {company.address ?? '—'}
                    </td>
                    {isAdmin && (
                      <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                        {company.owner.name}
                      </td>
                    )}
                    <td className="hidden px-4 py-3 text-slate-500 xl:table-cell">
                      {formatDate(company.updated_at)}
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
      <CompanyFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(company) => navigate(`/companies/${company.id}`)}
      />
    </>
  )
}
