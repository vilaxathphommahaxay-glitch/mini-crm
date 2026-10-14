import { useState, type FormEvent } from 'react'
import { errorMessage, fieldErrors } from '../api/client'
import { useBusinessProfile, useSaveBusinessProfile } from '../api/hooks'
import type { BusinessProfile } from '../api/types'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Field, FormError, Input, Textarea } from '../components/ui/form'
import { Card, CardHeader } from '../components/ui/layout'
import { ErrorState, LoadingState } from '../components/ui/states'
import { t } from '../i18n'

const EMPTY: Record<keyof BusinessProfile, string> = {
  name: '',
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  quote_terms: '',
}

/** Admins: the seller's details printed on every quote. */
export function BusinessProfileCard() {
  const profile = useBusinessProfile()
  return (
    <Card className="max-w-2xl">
      <CardHeader title={t('business.title')} />
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <BusinessProfileForm initial={profile.data} />
      )}
    </Card>
  )
}

function BusinessProfileForm({ initial }: { initial: BusinessProfile }) {
  const toast = useToast()
  const save = useSaveBusinessProfile()
  const [values, setValues] = useState(() => {
    const filled = { ...EMPTY }
    for (const key of Object.keys(EMPTY) as (keyof BusinessProfile)[]) {
      filled[key] = initial[key] ?? ''
    }
    return filled
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const bind = (key: keyof BusinessProfile) => ({
    value: values[key],
    onChange: (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  })

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    const body = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim() || null]),
    ) as unknown as BusinessProfile
    try {
      await save.mutateAsync(body)
      toast.success(t('business.saved'))
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(fields)
      if (!Object.keys(fields).length) setFormError(errorMessage(error))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 p-4">
      <p className="text-sm text-slate-500">{t('business.hint')}</p>
      <FormError message={formError} />
      <Field label={t('business.name')} error={errors.name}>
        {(c) => <Input {...c} {...bind('name')} autoComplete="organization" />}
      </Field>
      <Field label={t('f.address')} error={errors.address}>
        {(c) => <Textarea {...c} {...bind('address')} rows={2} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('f.phone')} error={errors.phone}>
          {(c) => <Input {...c} {...bind('phone')} type="tel" />}
        </Field>
        <Field label={t('f.email')} error={errors.email}>
          {(c) => <Input {...c} {...bind('email')} type="email" />}
        </Field>
      </div>
      <Field label={t('quote.taxId')} error={errors.tax_id}>
        {(c) => <Input {...c} {...bind('tax_id')} />}
      </Field>
      <Field label={t('business.terms')} hint={t('business.termsHint')} error={errors.quote_terms}>
        {(c) => <Textarea {...c} {...bind('quote_terms')} rows={4} />}
      </Field>
      <Button type="submit" loading={save.isPending}>
        {t('common.save')}
      </Button>
    </form>
  )
}
