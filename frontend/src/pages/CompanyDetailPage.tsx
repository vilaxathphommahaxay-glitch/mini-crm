import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { useCompany, useContacts, useDeals, useDeleteCompany } from '../api/hooks'
import { useCurrentUser } from '../auth/context'
import { DealsTable } from '../components/DealsTable'
import { DetailList } from '../components/DetailList'
import { AttachmentsCard } from '../components/Attachments'
import { HistoryCard } from '../components/HistoryList'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { telLink } from '../lib/phone'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'
import { ConfirmDialog } from '../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { CompanyFormModal } from '../forms/CompanyForm'
import { ContactFormModal } from '../forms/ContactForm'
import { NotFoundPage } from './NotFoundPage'
import { t } from '../i18n'

function safeHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function CompanyDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useCurrentUser().role === 'admin'
  const company = useCompany(id)
  const contacts = useContacts({ company_id: id, size: 100 })
  const deals = useDeals({ company_id: id, size: 100 })
  const remove = useDeleteCompany()

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingContact, setAddingContact] = useState(false)

  if (company.isPending) return <LoadingState />
  if (company.error instanceof ApiError && company.error.status === 404) return <NotFoundPage />
  if (company.isError) return <ErrorState error={company.error} onRetry={() => company.refetch()} />
  const c = company.data

  async function confirmDelete() {
    try {
      await remove.mutateAsync(c.id)
      toast.success(t('companyDetail.deleted'))
      navigate('/companies', { replace: true })
    } catch (error) {
      setDeleting(false)
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={
          <Link to="/companies" className="hover:text-indigo-600">
            {t('nav.companies')}
          </Link>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
            <Button variant="secondary" onClick={() => setDeleting(true)}>
              {t('common.delete')}
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card className="self-start">
          <CardHeader title={t('common.details')} />
          <DetailList
            items={[
              { label: t('f.phone'), value: c.phone && <a href={telLink(c.phone)}>{c.phone}</a> },
              {
                label: t('f.website'),
                value: c.website && (
                  <a
                    href={safeHref(c.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {c.website}
                  </a>
                ),
              },
              {
                label: t('f.address'),
                value: c.address && <span className="whitespace-pre-line">{c.address}</span>,
              },
              ...(isAdmin ? [{ label: t('f.owner'), value: c.owner.name }] : []),
              {
                label: t('f.notes'),
                value: c.notes && <span className="whitespace-pre-line">{c.notes}</span>,
              },
            ]}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={t('nav.contacts')}
              actions={
                <Button size="sm" variant="secondary" onClick={() => setAddingContact(true)}>
                  <Icon name="plus" className="size-3.5" />
                  {t('companyDetail.addContact')}
                </Button>
              }
            />
            {contacts.isPending ? (
              <LoadingState />
            ) : contacts.isError ? (
              <ErrorState error={contacts.error} onRetry={() => contacts.refetch()} />
            ) : contacts.data.items.length === 0 ? (
              <EmptyState title={t('companyDetail.noContacts')} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {contacts.data.items.map((contact) => (
                  <li key={contact.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {contact.full_name}
                    </Link>
                    <span className="text-sm text-slate-500">
                      {[contact.email, contact.phone].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={t('deals.title')} />
            {deals.isPending ? (
              <LoadingState />
            ) : deals.isError ? (
              <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
            ) : deals.data.items.length === 0 ? (
              <EmptyState title={t('companyDetail.noDeals')} />
            ) : (
              <DealsTable
                deals={deals.data.items}
                showContact
                onSelect={(deal) => navigate(`/deals/${deal.id}`)}
              />
            )}
          </Card>
        </div>
      </div>
      <div className="mt-6 space-y-6">
        <AttachmentsCard type="company" id={c.id} />
        <HistoryCard type="company" id={c.id} />
      </div>

      <CompanyFormModal open={editing} company={c} onClose={() => setEditing(false)} />
      <ContactFormModal
        open={addingContact}
        companyId={c.id}
        onClose={() => setAddingContact(false)}
      />
      <ConfirmDialog
        open={deleting}
        title={t('companyDetail.deleteTitle')}
        message={t('companyDetail.deleteMessage', { name: c.name })}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </>
  )
}
