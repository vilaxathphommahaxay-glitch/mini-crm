import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useContacts, useTags } from '../api/hooks'
import { useCurrentUser } from '../auth/context'
import { TagList } from '../components/badges'
import { Icon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/form'
import { Card, PageHeader } from '../components/ui/layout'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { ContactFormModal } from '../forms/ContactForm'
import { OwnerSelect } from '../forms/selects'
import { formatDate } from '../lib/format'
import { toId, useUrlFilters } from '../lib/hooks'

const PAGE_SIZE = 20

export function ContactsPage() {
  const user = useCurrentUser()
  const isAdmin = user.role === 'admin'
  const navigate = useNavigate()
  const { values, page, set } = useUrlFilters(['search', 'tag', 'owner_id'] as const)
  const [searchInput, setSearchInput] = useState(values.search)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [creating, setCreating] = useState(false)

  // the box updates instantly; the URL (and the query) 300 ms after typing stops
  function onSearchChange(text: string) {
    setSearchInput(text)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => set({ search: text.trim() }), 300)
  }

  const tags = useTags()
  const query = useContacts({
    search: values.search,
    tag: values.tag,
    owner_id: toId(values.owner_id),
    page,
    size: PAGE_SIZE,
  })
  const filtered = Boolean(values.search || values.tag || values.owner_id)

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={query.data ? `${query.data.total} contact(s)` : undefined}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="size-4" />
            New contact
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
              aria-label="Search contacts"
              placeholder="Search name, email, phone or company…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              aria-label="Filter by tag"
              value={values.tag}
              onChange={(e) => set({ tag: e.target.value })}
            >
              <option value="">All tags</option>
              {tags.data?.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </div>
          {isAdmin && (
            <div className="w-full sm:w-48">
              <OwnerSelect
                aria-label="Filter by owner"
                emptyLabel="All owners"
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
          <EmptyState title={filtered ? 'No contacts match these filters' : 'No contacts yet'}>
            {!filtered && 'Add your first contact or import a CSV file.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Company</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Email</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Phone</th>
                  <th className="px-4 py-2.5">Tags</th>
                  {isAdmin && <th className="hidden px-4 py-2.5 lg:table-cell">Owner</th>}
                  <th className="hidden px-4 py-2.5 xl:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.items.map((contact) => (
                  <tr
                    key={contact.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        to={`/contacts/${contact.id}`}
                        className="hover:text-indigo-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{contact.company?.name ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {contact.email ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 md:table-cell">
                      {contact.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TagList tags={contact.tags} />
                    </td>
                    {isAdmin && (
                      <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                        {contact.owner.name}
                      </td>
                    )}
                    <td className="hidden px-4 py-3 text-slate-500 xl:table-cell">
                      {formatDate(contact.updated_at)}
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

      <ContactFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(contact) => navigate(`/contacts/${contact.id}`)}
      />
    </>
  )
}
