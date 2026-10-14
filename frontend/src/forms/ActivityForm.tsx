import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useSaveActivity } from '../api/hooks'
import { ACTIVITY_LABELS, ACTIVITY_TYPES, type Activity, type ActivityType } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { useToast } from '../components/toast/context'
import { Field, FormError, Input, Select, Textarea } from '../components/ui/form'
import { Modal } from '../components/ui/Modal'
import { FormFooter } from './FormFooter'
import { addDaysISO } from '../lib/format'
import { activitySchema, toActivityBody, toFollowUpBody, type ActivityFormValues } from './schemas'
import { ContactSelect, DealSelect, OwnerSelect } from './selects'
import { applyServerErrors } from './serverErrors'

const FIELDS = [
  'type',
  'subject',
  'description',
  'due_date',
  'done',
  'contact_id',
  'deal_id',
  'owner_id',
]
const FOLLOW_UP_DAYS = 3

interface Props {
  activity?: Activity
  /** fixed links when logging from a contact or deal page */
  contactId?: number
  dealId?: number
  defaultType?: ActivityType
  defaultDueDate?: string
  onClose: () => void
}

function ActivityForm({
  activity,
  contactId,
  dealId,
  defaultType = 'task',
  defaultDueDate = '',
  onClose,
}: Props) {
  const isAdmin = useCurrentUser().role === 'admin'
  const save = useSaveActivity()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: activity?.type ?? defaultType,
      subject: activity?.subject ?? '',
      description: activity?.description ?? '',
      due_date: activity ? (activity.due_date ?? '') : defaultDueDate,
      done: activity?.done ?? false,
      contact_id: String(activity?.contact?.id ?? contactId ?? ''),
      deal_id: String(activity?.deal?.id ?? dealId ?? ''),
      owner_id: activity ? String(activity.owner.id) : '',
      follow_up: false,
      follow_up_subject: 'Follow up',
      follow_up_date: addDaysISO(FOLLOW_UP_DAYS),
    },
  })
  const selectedContact = useWatch({ control, name: 'contact_id' })
  const type = useWatch({ control, name: 'type' })
  const followUp = useWatch({ control, name: 'follow_up' })
  // a logged call/meeting/note can schedule its next step in the same form
  const canFollowUp = !activity && type !== 'task'
  const showDate = type === 'task' || type === 'meeting' || Boolean(activity?.due_date)
  const lockedContact = contactId !== undefined && !activity

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    // a hidden date (e.g. switched from Task to Call) must not be saved
    const body = showDate ? values : { ...values, due_date: '', done: false }
    try {
      await save.mutateAsync({ id: activity?.id, body: toActivityBody(body) })
      const next = canFollowUp ? toFollowUpBody(values) : null
      if (next) await save.mutateAsync({ body: next })
      toast.success(
        activity
          ? 'Activity updated'
          : next
            ? 'Activity saved, follow-up scheduled'
            : 'Activity saved',
      )
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Type" error={errors.type?.message}>
          {(c) => (
            <Select {...c} {...register('type')}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_LABELS[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Subject" required error={errors.subject?.message}>
          {(c) => <Input {...c} {...register('subject')} autoComplete="off" />}
        </Field>
      </div>
      <Field label="Details" error={errors.description?.message}>
        {(c) => <Textarea {...c} {...register('description')} />}
      </Field>
      {/* calls and notes record what already happened; tasks and meetings have a date */}
      {showDate && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={type === 'meeting' ? 'Date' : 'Due date'}
            error={errors.due_date?.message}
            hint={type === 'meeting' ? 'Set it for an upcoming meeting' : undefined}
          >
            {(c) => <Input {...c} {...register('due_date')} type="date" />}
          </Field>
          <label className="flex items-center gap-2 self-center text-sm text-slate-700 sm:mt-6">
            <input
              type="checkbox"
              {...register('done')}
              className="size-4 rounded border-slate-300"
            />
            Done
          </label>
        </div>
      )}
      {!lockedContact && (
        <Field label="Contact" error={errors.contact_id?.message}>
          {(c) => <ContactSelect {...c} {...register('contact_id')} />}
        </Field>
      )}
      {dealId === undefined && (
        <Field label="Deal" error={errors.deal_id?.message}>
          {(c) => <DealSelect {...c} {...register('deal_id')} contactId={selectedContact} />}
        </Field>
      )}
      {isAdmin && (
        <Field label="Owner" error={errors.owner_id?.message}>
          {(c) => <OwnerSelect {...c} {...register('owner_id')} current={activity?.owner} />}
        </Field>
      )}
      {canFollowUp && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              {...register('follow_up')}
              className="size-4 rounded border-slate-300"
            />
            Schedule a follow-up task
          </label>
          {followUp && (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_11rem]">
              <Field label="Next step" required error={errors.follow_up_subject?.message}>
                {(c) => <Input {...c} {...register('follow_up_subject')} autoComplete="off" />}
              </Field>
              <Field label="Due" required error={errors.follow_up_date?.message}>
                {(c) => <Input {...c} {...register('follow_up_date')} type="date" />}
              </Field>
            </div>
          )}
        </div>
      )}
      <FormFooter onCancel={onClose} saving={save.isPending} />
    </form>
  )
}

export function ActivityFormModal({ open, ...props }: Props & { open: boolean }) {
  return (
    <Modal
      open={open}
      title={props.activity ? 'Edit activity' : 'New activity'}
      onClose={props.onClose}
    >
      <ActivityForm {...props} />
    </Modal>
  )
}
