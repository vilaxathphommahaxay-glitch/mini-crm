import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { useActivities, useContact, useDeals, useDeleteContact } from '../api/hooks'
import { useCurrentUser } from '../auth/context'
import { ActivityList } from '../components/ActivityList'
import { HistoryCard } from '../components/HistoryList'
import { TagList } from '../components/badges'
import { DealsTable } from '../components/DealsTable'
import { DetailList } from '../components/DetailList'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { telLink, whatsappLink } from '../lib/phone'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'
import { ConfirmDialog } from '../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { ActivityFormModal } from '../forms/ActivityForm'
import { ContactFormModal } from '../forms/ContactForm'
import { DealFormModal } from '../forms/DealForm'
import { NotFoundPage } from './NotFoundPage'
import { t } from '../i18n'

export function ContactDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useCurrentUser().role === 'admin'
  const contact = useContact(id)
  const deals = useDeals({ contact_id: id, size: 100 })
  const timeline = useActivities({ contact_id: id, size: 50 })
  const remove = useDeleteContact()

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [logging, setLogging] = useState(false)
  const [creatingDeal, setCreatingDeal] = useState(false)

  if (contact.isPending) return <LoadingState />
  if (contact.error instanceof ApiError && contact.error.status === 404) return <NotFoundPage />
  if (contact.isError) return <ErrorState error={contact.error} onRetry={() => contact.refetch()} />
  const c = contact.data

  async function confirmDelete() {
    try {
      await remove.mutateAsync(c.id)
      toast.success(t('contactDetail.deleted'))
      navigate('/contacts', { replace: true })
    } catch (error) {
      setDeleting(false)
      toast.error(errorMessage(error)) // e.g. "This contact still has 2 deal(s)…"
    }
  }

  return (
    <>
      <PageHeader
        title={c.full_name}
        subtitle={
          <>
            <Link to="/contacts" className="hover:text-indigo-600">
              {t('nav.contacts')}
            </Link>
            {c.company && (
              <>
                {' · '}
                <Link to={`/companies/${c.company.id}`} className="hover:text-indigo-600">
                  {c.company.name}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            {c.phone && (
              <a href={telLink(c.phone)} className={buttonClass('secondary')}>
                <Icon name="phone" className="size-4" />
                {t('common.call')}
              </a>
            )}
            {whatsappLink(c.phone) && (
              <a
                href={whatsappLink(c.phone)!}
                target="_blank"
                rel="noreferrer"
                className={buttonClass('secondary', 'md', 'text-green-700')}
              >
                <Icon name="chat" className="size-4" />
                {t('common.whatsapp')}
              </a>
            )}
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
              {
                label: t('f.email'),
                value: c.email && <a href={`mailto:${c.email}`}>{c.email}</a>,
              },
              { label: t('f.phone'), value: c.phone && <a href={telLink(c.phone)}>{c.phone}</a> },
              { label: t('f.company'), value: c.company?.name },
              { label: t('f.tags'), value: <TagList tags={c.tags} /> },
              ...(isAdmin ? [{ label: t('f.owner'), value: c.owner.name }] : []),
              {
                label: t('f.notes'),
                value: c.notes && <span className="whitespace-pre-line">{c.notes}</span>,
              },
            ]}
          />
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title={t('deals.title')}
              actions={
                <Button size="sm" variant="secondary" onClick={() => setCreatingDeal(true)}>
                  <Icon name="plus" className="size-3.5" />
                  {t('dealForm.new')}
                </Button>
              }
            />
            {deals.isPending ? (
              <LoadingState />
            ) : deals.isError ? (
              <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
            ) : deals.data.items.length === 0 ? (
              <EmptyState title={t('contactDetail.noDeals')} />
            ) : (
              <DealsTable
                deals={deals.data.items}
                onSelect={(deal) => navigate(`/deals/${deal.id}`)}
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title={t('act.title')}
              actions={
                <Button size="sm" onClick={() => setLogging(true)}>
                  <Icon name="plus" className="size-3.5" />
                  {t('act.log')}
                </Button>
              }
            />
            {timeline.isPending ? (
              <LoadingState />
            ) : timeline.isError ? (
              <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />
            ) : timeline.data.items.length === 0 ? (
              <EmptyState title={t('act.none')}>{t('act.noneHint')}</EmptyState>
            ) : (
              <ActivityList activities={timeline.data.items} showLinks={false} />
            )}
          </Card>
        </div>
      </div>
      <div className="mt-6">
        <HistoryCard type="contact" id={c.id} />
      </div>

      <ContactFormModal open={editing} contact={c} onClose={() => setEditing(false)} />
      <ActivityFormModal
        open={logging}
        defaultType="call"
        contactId={c.id}
        onClose={() => setLogging(false)}
      />
      <DealFormModal open={creatingDeal} contactId={c.id} onClose={() => setCreatingDeal(false)} />
      <ConfirmDialog
        open={deleting}
        title={t('contactDetail.deleteTitle')}
        message={t('contactDetail.deleteMessage', { name: c.full_name })}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </>
  )
}
