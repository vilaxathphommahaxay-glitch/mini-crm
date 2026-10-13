import { useId, type ComponentProps, type ReactNode } from 'react'

const CONTROL =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 ' +
  'focus:ring-indigo-500/20 disabled:bg-slate-50 aria-[invalid=true]:border-red-400'

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${CONTROL} ${className}`} {...props} />
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${CONTROL} pr-8 ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${CONTROL} min-h-20 ${className}`} rows={3} {...props} />
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  /** Render prop gets the id and aria props to put on the control. */
  children: (control: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
}

export function Field({ label, error, hint, required, className = '', children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </div>
  )
}
