import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/context'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { Button } from '../components/ui/Button'
import { Field, FormError, Input } from '../components/ui/form'
import { t } from '../i18n'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
  if (user) return <Navigate to={from} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="fixed top-4 right-4">
        <LanguageSwitch tone="light" />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
            C
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">{t('login.title')}</h1>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <FormError message={error} />
          <Field label={t('login.email')}>
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('login.password')}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Button
            type="submit"
            className="w-full"
            loading={submitting}
            disabled={!email || !password}
          >
            {t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
