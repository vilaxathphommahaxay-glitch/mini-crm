import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSaveCompany } from '../api/hooks'
import type { Company } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { useToast } from '../components/toast/context'
import { Field, FormError, Input, Textarea } from '../components/ui/form'
import { Modal } from '../components/ui/Modal'
import { FormFooter } from './FormFooter'
import { companySchema, toCompanyBody, type CompanyFormValues } from './schemas'
import { OwnerSelect } from './selects'
import { applyServerErrors } from './serverErrors'

const FIELDS = Object.keys(companySchema.shape)

interface Props {
  company?: Company
  onClose: () => void
  onSaved?: (company: Company) => void
}

function CompanyForm({ company, onClose, onSaved }: Props) {
  const isAdmin = useCurrentUser().role === 'admin'
  const save = useSaveCompany()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? '',
      phone: company?.phone ?? '',
      website: company?.website ?? '',
      address: company?.address ?? '',
      notes: company?.notes ?? '',
      owner_id: company ? String(company.owner.id) : '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await save.mutateAsync({ id: company?.id, body: toCompanyBody(values) })
      toast.success(company ? 'Company updated' : 'Company created')
      onSaved?.(saved)
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <Field label="Name" required error={errors.name?.message}>
        {(c) => <Input {...c} {...register('name')} autoComplete="off" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" error={errors.phone?.message}>
          {(c) => <Input {...c} {...register('phone')} type="tel" autoComplete="off" />}
        </Field>
        <Field label="Website" error={errors.website?.message}>
          {(c) => <Input {...c} {...register('website')} placeholder="https://" />}
        </Field>
      </div>
      <Field label="Address" error={errors.address?.message}>
        {(c) => <Textarea {...c} {...register('address')} rows={2} />}
      </Field>
      {isAdmin && (
        <Field label="Owner" error={errors.owner_id?.message}>
          {(c) => <OwnerSelect {...c} {...register('owner_id')} />}
        </Field>
      )}
      <Field label="Notes" error={errors.notes?.message}>
        {(c) => <Textarea {...c} {...register('notes')} />}
      </Field>
      <FormFooter onCancel={onClose} saving={save.isPending} />
    </form>
  )
}

export function CompanyFormModal({ open, ...props }: Props & { open: boolean }) {
  return (
    <Modal
      open={open}
      title={props.company ? 'Edit company' : 'New company'}
      onClose={props.onClose}
    >
      <CompanyForm {...props} />
    </Modal>
  )
}
