import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useSaveUser } from '../api/hooks'
import type { User } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { useToast } from '../components/toast/context'
import { Field, FormError, Input, Select } from '../components/ui/form'
import { Modal } from '../components/ui/Modal'
import { FormFooter } from './FormFooter'
import { applyServerErrors } from './serverErrors'
import { msg, t } from '../i18n'

// Password is required for new users; when editing, empty means "keep the current one".
function userSchema(isNew: boolean) {
  return z.object({
    name: z.string().trim().min(1, msg('validation.nameRequired')).max(100),
    email: z.email(msg('validation.email')),
    password: isNew
      ? z.string().min(8, msg('validation.minChars', 8))
      : z.string().refine((v) => v === '' || v.length >= 8, msg('validation.minChars', 8)),
    role: z.enum(['admin', 'staff']),
    is_active: z.boolean(),
  })
}
type UserFormValues = z.infer<ReturnType<typeof userSchema>>
const FIELDS = ['name', 'email', 'password', 'role', 'is_active']

interface Props {
  user?: User
  onClose: () => void
}

function UserForm({ user, onClose }: Props) {
  const me = useCurrentUser()
  const isSelf = user?.id === me.id
  const save = useSaveUser()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(!user)),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      password: '',
      role: user?.role ?? 'staff',
      is_active: user?.is_active ?? true,
    },
  })

  const onSubmit = handleSubmit(async ({ password, ...rest }) => {
    setFormError(null)
    const body = {
      ...rest,
      email: rest.email.toLowerCase(),
      ...(password ? { password } : {}),
      // new users are always active; is_active is only sent on edit
      ...(user ? {} : { is_active: undefined }),
    }
    try {
      await save.mutateAsync({ id: user?.id, body })
      toast.success(t(user ? 'userForm.updated' : 'userForm.created'))
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, FIELDS))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <Field label={t('f.name')} required error={errors.name?.message}>
        {(c) => <Input {...c} {...register('name')} autoComplete="off" />}
      </Field>
      <Field label={t('f.email')} required error={errors.email?.message}>
        {(c) => <Input {...c} {...register('email')} type="email" autoComplete="off" />}
      </Field>
      <Field
        label={t(user ? 'settings.new' : 'f.password')}
        required={!user}
        error={errors.password?.message}
        hint={user ? t('userForm.passwordKeep') : t('settings.newHint', { n: 8 })}
      >
        {(c) => (
          <Input {...c} {...register('password')} type="password" autoComplete="new-password" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('f.role')}
          error={errors.role?.message}
          hint={isSelf ? t('userForm.roleSelf') : undefined}
        >
          {(c) => (
            <Select {...c} {...register('role')} disabled={isSelf}>
              <option value="staff">{t('role.staff')}</option>
              <option value="admin">{t('role.admin')}</option>
            </Select>
          )}
        </Field>
        {user && (
          <label className="flex items-center gap-2 self-center text-sm text-slate-700 sm:mt-6">
            <input
              type="checkbox"
              {...register('is_active')}
              disabled={isSelf}
              className="size-4 rounded border-slate-300"
            />
            {t('f.active')}
          </label>
        )}
      </div>
      {user && !isSelf && <p className="text-xs text-slate-500">{t('userForm.disableNote')}</p>}
      <FormFooter onCancel={onClose} saving={save.isPending} />
    </form>
  )
}

export function UserFormModal({ open, ...props }: Props & { open: boolean }) {
  return (
    <Modal
      open={open}
      title={t(props.user ? 'userForm.edit' : 'userForm.new')}
      onClose={props.onClose}
    >
      <UserForm {...props} />
    </Modal>
  )
}
