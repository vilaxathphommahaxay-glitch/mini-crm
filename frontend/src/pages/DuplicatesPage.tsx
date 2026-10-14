import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../api/client'
import { useDuplicates, useMergeContacts } from '../api/hooks'
import type { DuplicateContact, DuplicateGroup } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { TagList } from '../components/badges'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Badge, Card, PageHeader } from '../components/ui/layout'
import { ConfirmDialog } from '../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/states'
import { OwnerSelect } from '../forms/selects'
import { formatDate } from '../lib/format'
import { toId, useUrlFilters } from '../lib/hooks'
import { t } from '../i18n'

interface Choice {
  keep: DuplicateContact
  others: DuplicateContact[]
}

export function DuplicatesPage() {
  const isAdmin = useCurrentUser().role === 'admin'
  const toast = useToast()
  const { values, set } = useUrlFilters(['owner_id'] as const)
  const groups = useDuplicates(toId(values.owner_id))
  const merge = useMergeContacts()
  const [choice, setChoice] = useState<Choice | null>(null)

  async function confirmMerge() {
    if (!choice) return
    try {
      // one at a time: each merge fills the kept contact's blanks from the next one
      for (const other of choice.others) {
        await merge.mutateAsync({ keepId: choice.keep.id, otherId: other.id })
      }
      toast.success(t('dup.merged', { name: choice.keep.full_name }))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setChoice(null)
    }
  }

  return (
    <>
      <PageHeader
        title={t('dup.title')}
        subtitle={
          <>
            <Link to="/contacts" className="hover:text-indigo-600">
              {t('nav.contacts')}
            </Link>
            {' · '}
            {t('dup.subtitle')}
          </>
        }
        actions={
          isAdmin && (
            <div className="w-48">
              <OwnerSelect
                aria-label={t('common.filterOwner')}
                emptyLabel={t('select.allOwners')}
                value={values.owner_id}
                onChange={(e) => set({ owner_id: e.target.value })}
              />
            </div>
          )
        }
      />
      {groups.isPending ? (
        <LoadingState />
      ) : groups.isError ? (
        <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
      ) : groups.data.length === 0 ? (
        <Card>
          <EmptyState title={t('dup.none')}>{t('dup.noneHint')}</EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.data.map((group) => (
            <GroupCard
              key={group.contacts.map((c) => c.id).join('-')}
              group={group}
              showOwner={isAdmin}
              onKeep={(keep) =>
                setChoice({ keep, others: group.contacts.filter((c) => c.id !== keep.id) })
              }
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={choice !== null}
        title={t('dup.confirmTitle')}
        message={t('dup.confirmMessage', {
          name: choice?.keep.full_name ?? '',
          count: choice?.others.length ?? 0,
        })}
        confirmLabel={t('dup.merge')}
        loading={merge.isPending}
        onConfirm={confirmMerge}
        onCancel={() => setChoice(null)}
      />
    </>
  )
}

function GroupCard({
  group,
  showOwner,
  onKeep,
}: {
  group: DuplicateGroup
  showOwner: boolean
  onKeep: (keep: DuplicateContact) => void
}) {
  return (
    <Card>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
        {group.reasons.map((reason) => (
          <Badge key={reason} color="amber">
            {t(`dup.reason.${reason}`)}
          </Badge>
        ))}
      </div>
      <ul className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex flex-col gap-2 rounded-md border border-slate-200 p-4 text-sm"
          >
            <Link
              to={`/contacts/${contact.id}`}
              className="font-medium text-slate-900 hover:text-indigo-600"
            >
              {contact.full_name}
            </Link>
            <dl className="space-y-0.5 text-slate-600">
              {contact.phone && <dd>{contact.phone}</dd>}
              {contact.email && <dd className="break-all">{contact.email}</dd>}
              {contact.company && <dd>{contact.company.name}</dd>}
              {showOwner && <dd>{contact.owner.name}</dd>}
            </dl>
            <TagList tags={contact.tags} />
            <p className="text-xs text-slate-500">
              {t('dup.counts', {
                deals: contact.deals,
                activities: contact.activities,
                files: contact.files,
              })}
              <br />
              {t('dup.added', { date: formatDate(contact.created_at) })}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-auto self-start"
              aria-label={`${t('dup.keep')}: ${contact.full_name}`}
              onClick={() => onKeep(contact)}
            >
              {t('dup.keep')}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
