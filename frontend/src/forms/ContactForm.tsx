import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useSaveContact } from '../api/hooks'
import type { Contact } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { useToast } from '../components/toast/context'
import { Field, FormError, Input, Textarea } from '../components/ui/form'
import { Modal } from '../components/ui/Modal'
import { FormFooter } from './FormFooter'
import { contactSchema, NEW_COMPANY, toContactBody, type ContactFormValues } from './schemas'
import { CompanySelect, OwnerSelect } from './selects'
import { applyServerErrors } from './serverErrors'

const FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'company_id',
  'company_name',
  'tags',
  'notes',
  'owner_id',
]

function initialValues(contact?: Contact, companyId?: number): ContactFormValues {
  return {
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    company_id: String(contact?.company?.id ?? companyId ?? ''),
    company_name: '',
    tags: contact?.tags.join(', ') ?? '',
    notes: contact?.notes ?? '',
    owner_id: contact ? String(contact.owner.id) : '',
  }
}

interface Props {
  contact?: Contact
  /** preselect a company when adding from a company page */
  companyId?: number
  onClose: () => void
  onSaved?: (contact: Contact) => void
}

export function ContactForm({ contact, companyId, onClose, onSaved }: Props) {
  const isAdmin = useCurrentUser().role === 'admin'
  const save = useSaveContact()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: initialValues(contact, companyId),
  })

  const newCompany = useWatch({ control, name: 'company_id' }) === NEW_COMPANY

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await save.mutateAsync({ id: contact?.id, body: toContactBody(values) })
      toast.success(contact ? 'Contact updated' : 'Contact created')
      onSaved?.(saved)
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.first_name?.message}>
          {(c) => <Input {...c} {...register('first_name')} autoComplete="off" />}
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          {(c) => <Input {...c} {...register('last_name')} autoComplete="off" />}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(c) => <Input {...c} {...register('email')} type="email" autoComplete="off" />}
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          {(c) => <Input {...c} {...register('phone')} type="tel" autoComplete="off" />}
        </Field>
      </div>
      <Field label="Company" error={errors.company_id?.message}>
        {(c) => <CompanySelect {...c} {...register('company_id')} allowCreate />}
      </Field>
      {newCompany && (
        <Field
          label="New company name"
          required
          error={errors.company_name?.message}
          hint="If a company with this name already exists, the contact is added to it"
        >
          {(c) => <Input {...c} {...register('company_name')} autoComplete="off" autoFocus />}
        </Field>
      )}
      <Field
        label="Tags"
        error={errors.tags?.message}
        hint="Separate with commas, e.g. vip, wholesale"
      >
        {(c) => <Input {...c} {...register('tags')} autoComplete="off" />}
      </Field>
      {isAdmin && (
        <Field label="Owner" error={errors.owner_id?.message}>
          {(c) => <OwnerSelect {...c} {...register('owner_id')} current={contact?.owner} />}
        </Field>
      )}
      <Field label="Notes" error={errors.notes?.message}>
        {(c) => <Textarea {...c} {...register('notes')} />}
      </Field>
      <FormFooter onCancel={onClose} saving={save.isPending} />
    </form>
  )
}

export function ContactFormModal({ open, ...props }: Props & { open: boolean }) {
  return (
    <Modal
      open={open}
      title={props.contact ? 'Edit contact' : 'New contact'}
      onClose={props.onClose}
    >
      <ContactForm {...props} />
    </Modal>
  )
}
