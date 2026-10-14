import { ButtonLink } from '../components/ui/Button'
import { t } from '../i18n'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="text-2xl font-semibold text-slate-900">{t('page.notFound')}</h1>
      <p className="text-sm text-slate-500">{t('page.notFoundText')}</p>
      <ButtonLink to="/" variant="secondary" className="mt-2">
        {t('page.backHome')}
      </ButtonLink>
    </div>
  )
}
