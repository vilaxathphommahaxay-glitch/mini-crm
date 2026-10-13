import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">The page you are looking for doesn’t exist.</p>
      <ButtonLink to="/" variant="secondary" className="mt-2">
        Back to dashboard
      </ButtonLink>
    </div>
  )
}
