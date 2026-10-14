import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { useActivities, useContact, useDeals, useDeleteContact } from '../api/hooks'
import { useCurrentUser } from '../auth/context'
import { ActivityList } from '../components/ActivityList'
import { TagList } from '../components/badges'
import { DealsTable } from '../components/DealsTable'
import { DetailList } from '../components/DetailList'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'
import { ConfirmDialog } from '../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { ActivityFormModal } from '../forms/ActivityForm'
import { ContactFormModal } from '../forms/ContactForm'
import { DealFormModal } from '../forms/DealForm'
import { NotFoundPage } from './NotFoundPage'

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
      toast.success('Contact deleted')
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
              Contacts
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
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card className="self-start">
          <CardHeader title="Details" />
          <DetailList
            items={[
              { label: 'Email', value: c.email && <a href={`mailto:${c.email}`}>{c.email}</a> },
              { label: 'Phone', value: c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a> },
              { label: 'Company', value: c.company?.name },
              { label: 'Tags', value: <TagList tags={c.tags} /> },
              ...(isAdmin ? [{ label: 'Owner', value: c.owner.name }] : []),
              {
                label: 'Notes',
                value: c.notes && <span className="whitespace-pre-line">{c.notes}</span>,
              },
            ]}
          />
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Deals"
              actions={
                <Button size="sm" variant="secondary" onClick={() => setCreatingDeal(true)}>
                  <Icon name="plus" className="size-3.5" />
                  New deal
                </Button>
              }
            />
            {deals.isPending ? (
              <LoadingState />
            ) : deals.isError ? (
              <ErrorState error={deals.error} onRetry={() => deals.refetch()} />
            ) : deals.data.items.length === 0 ? (
              <EmptyState title="No deals yet" />
            ) : (
              <DealsTable
                deals={deals.data.items}
                onSelect={(deal) => navigate(`/deals/${deal.id}`)}
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Activity"
              actions={
                <Button size="sm" onClick={() => setLogging(true)}>
                  <Icon name="plus" className="size-3.5" />
                  Log activity
                </Button>
              }
            />
            {timeline.isPending ? (
              <LoadingState />
            ) : timeline.isError ? (
              <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />
            ) : timeline.data.items.length === 0 ? (
              <EmptyState title="No activity yet">Log a call, meeting, note or task.</EmptyState>
            ) : (
              <ActivityList activities={timeline.data.items} showLinks={false} />
            )}
          </Card>
        </div>
      </div>

      <ContactFormModal open={editing} contact={c} onClose={() => setEditing(false)} />
      <ActivityFormModal open={logging} contactId={c.id} onClose={() => setLogging(false)} />
      <DealFormModal open={creatingDeal} contactId={c.id} onClose={() => setCreatingDeal(false)} />
      <ConfirmDialog
        open={deleting}
        title="Delete contact?"
        message={`${c.full_name} and their activity history will be deleted. Contacts with deals can't be deleted.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </>
  )
}
