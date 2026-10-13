import type { ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import { Button } from './Button'

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-indigo-500 border-t-transparent ${className}`}
    />
  )
}

export function LoadingState({ label = 'Loading…', fullScreen = false }) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 text-sm text-slate-500 ${fullScreen ? 'min-h-screen' : 'py-12'}`}
    >
      <Spinner />
      {label}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="text-sm text-red-600">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
