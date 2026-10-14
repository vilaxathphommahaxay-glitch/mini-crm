import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { errorMessage } from '../api/client'
import { useDeleteDeal, useSaveDeal } from '../api/hooks'
import { CURRENCIES, STAGES, type Deal, type Stage } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { StageBadge } from '../components/badges'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Field, FormError, Input, Select } from '../components/ui/form'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { dealSchema, toDealBody, type DealFormValues } from './schemas'
import { CompanySelect, ContactSelect, OwnerSelect } from './selects'
import { applyServerErrors } from './serverErrors'
import { t } from '../i18n'

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
      toast.success(t(deal ? 'dealForm.updated' : 'dealForm.created'))
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS))
    }
  })

  async function onDelete() {
    if (!deal) return
    try {
      await remove.mutateAsync(deal.id)
      toast.success(t('dealForm.deleted'))
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
      <Field label={t('f.title')} required error={errors.title?.message}>
        {(c) => <Input {...c} {...register('title')} autoComplete="off" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label={t('f.value')} required error={errors.value?.message}>
          {(c) => <Input {...c} {...register('value')} inputMode="decimal" autoComplete="off" />}
        </Field>
        <Field label={t('f.currency')} error={errors.currency?.message}>
          {(c) => (
            <Select {...c} {...register('currency')}>
              {CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {t(`currency.${cur}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {deal ? (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">{t('f.stage')}</p>
            <div className="py-2">
              <StageBadge stage={deal.stage} />
              <span className="ml-2 text-xs text-slate-500">{t('dealForm.stageHint')}</span>
            </div>
          </div>
        ) : (
          <Field label={t('f.stage')} error={errors.stage?.message}>
            {(c) => (
              <Select {...c} {...register('stage')}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {t(`stage.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label={t('f.expectedClose')} error={errors.expected_close_date?.message}>
          {(c) => <Input {...c} {...register('expected_close_date')} type="date" />}
        </Field>
      </div>
      {!lockedContact && (
        <Field label={t('f.contact')} required error={errors.contact_id?.message}>
          {(c) => <ContactSelect {...c} {...register('contact_id')} />}
        </Field>
      )}
      <Field
        label={t('f.company')}
        error={errors.company_id?.message}
        hint={deal ? undefined : t('dealForm.companyHint')}
      >
        {(c) => <CompanySelect {...c} {...register('company_id')} />}
      </Field>
      {isAdmin && (
        <Field label={t('f.owner')} error={errors.owner_id?.message}>
          {(c) => <OwnerSelect {...c} {...register('owner_id')} current={deal?.owner} />}
        </Field>
      )}

      <div className="-mx-5 mt-5 -mb-4 flex items-center gap-2 border-t border-slate-200 px-5 py-3">
        {deal && (
          <Button variant="dangerGhost" onClick={() => setConfirmDelete(true)}>
            {t('dealForm.delete')}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t('dealForm.deleteTitle')}
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
    <Modal
      open={open}
      title={t(props.deal ? 'dealForm.edit' : 'dealForm.new')}
      onClose={props.onClose}
    >
      <DealForm {...props} />
    </Modal>
  )
}
