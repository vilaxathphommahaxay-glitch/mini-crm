import { useState, type FormEvent } from 'react'
import { api, errorMessage, fieldErrors } from '../api/client'
import { useCurrentUser } from '../auth/context'
import { useToast } from '../components/toast/context'
import { Button } from '../components/ui/Button'
import { Field, FormError, Input } from '../components/ui/form'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'

const MIN_PASSWORD = 8

export function SettingsPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const problems: Record<string, string> = {}
    if (next.length < MIN_PASSWORD) problems.new_password = `At least ${MIN_PASSWORD} characters`
    if (next !== confirm) problems.confirm = 'Passwords do not match'
    setErrors(problems)
    setFormError(null)
    if (Object.keys(problems).length) return

    setSaving(true)
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      })
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Password changed')
    } catch (err) {
      const fields = fieldErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle={`${user.name} · ${user.email}`} />
      <Card className="max-w-md">
        <CardHeader title="Change password" />
        <form onSubmit={onSubmit} className="space-y-4 p-4" noValidate>
          <FormError message={formError} />
          <Field label="Current password" error={errors.current_password}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
          </Field>
          <Field label="New password" error={errors.new_password} hint="At least 8 characters">
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            )}
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" loading={saving} disabled={!current || !next}>
            Change password
          </Button>
        </form>
      </Card>
    </>
  )
}
