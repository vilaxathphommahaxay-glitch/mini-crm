import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { errorMessage } from '../api/client'
import { useDeleteDeal, useSaveDeal } from '../api/hooks'
import { CURRENCIES, STAGE_LABELS, STAGES, type Deal, type Stage } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { StageBadge } from '../components/badges'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Field, FormError, Input, Select } from '../components/ui/form'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { dealSchema, toDealBody, type DealFormValues } from './schemas'
import { CompanySelect, ContactSelect, OwnerSelect } from './selects'
import { applyServerErrors } from './serverErrors'

const FIELDS = Object.keys(dealSchema.shape)

interface Props {
  deal?: Deal
  /** creating from a contact page: contact is fixed */
  contactId?: number
  /** creating from a pipeline column */
  stage?: Stage
  onClose: () => void
  /** after a successful delete (e.g. leave the deal's own page) */
  onDeleted?: () => void
}

function DealForm({ deal, contactId, stage, onClose, onDeleted }: Props) {
  const isAdmin = useCurrentUser().role === 'admin'
  const save = useSaveDeal()
  const remove = useDeleteDeal()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: deal?.title ?? '',
      // show "1500000" rather than "1500000.00" for whole amounts
      value: deal ? deal.value.replace(/\.00$/, '') : '',
      currency: deal?.currency ?? 'LAK',
      stage: deal?.stage ?? stage ?? 'lead',
      contact_id: String(deal?.contact.id ?? contactId ?? ''),
      company_id: String(deal?.company?.id ?? ''),
      expected_close_date: deal?.expected_close_date ?? '',
      owner_id: deal ? String(deal.owner.id) : '',
    },
  })
  const lockedContact = contactId !== undefined && !deal

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await save.mutateAsync({ id: deal?.id, body: toDealBody(values, !deal) })
      toast.success(deal ? 'Deal updated' : 'Deal created')
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS))
    }
  })

  async function onDelete() {
    if (!deal) return
    try {
      await remove.mutateAsync(deal.id)
      toast.success('Deal deleted')
      onClose()
      onDeleted?.()
    } catch (error) {
      setConfirmDelete(false)
      setFormError(errorMessage(error))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <Field label="Title" required error={errors.title?.message}>
        {(c) => <Input {...c} {...register('title')} autoComplete="off" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Value" required error={errors.value?.message}>
          {(c) => <Input {...c} {...register('value')} inputMode="decimal" autoComplete="off" />}
        </Field>
        <Field label="Currency" error={errors.currency?.message}>
          {(c) => (
            <Select {...c} {...register('currency')}>
              {CURRENCIES.map((cur) => (
                <option key={cur}>{cur}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {deal ? (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Stage</p>
            <div className="py-2">
              <StageBadge stage={deal.stage} />
              <span className="ml-2 text-xs text-slate-500">change it on the Pipeline board</span>
            </div>
          </div>
        ) : (
          <Field label="Stage" error={errors.stage?.message}>
            {(c) => (
              <Select {...c} {...register('stage')}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Expected close" error={errors.expected_close_date?.message}>
          {(c) => <Input {...c} {...register('expected_close_date')} type="date" />}
        </Field>
      </div>
      {!lockedContact && (
        <Field label="Contact" required error={errors.contact_id?.message}>
          {(c) => <ContactSelect {...c} {...register('contact_id')} />}
        </Field>
      )}
      <Field
        label="Company"
        error={errors.company_id?.message}
        hint={deal ? undefined : "Leave empty to use the contact's company"}
      >
        {(c) => <CompanySelect {...c} {...register('company_id')} />}
      </Field>
      {isAdmin && (
        <Field label="Owner" error={errors.owner_id?.message}>
          {(c) => <OwnerSelect {...c} {...register('owner_id')} current={deal?.owner} />}
        </Field>
      )}

      <div className="-mx-5 mt-5 -mb-4 flex items-center gap-2 border-t border-slate-200 px-5 py-3">
        {deal && (
          <Button variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(true)}>
            Delete deal
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete deal?"
        message={`“${deal?.title}” will be deleted. Its activities stay on the contact's timeline.`}
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  )
}

export function DealFormModal({ open, ...props }: Props & { open: boolean }) {
  return (
    <Modal open={open} title={props.deal ? 'Edit deal' : 'New deal'} onClose={props.onClose}>
      <DealForm {...props} />
    </Modal>
  )
}
