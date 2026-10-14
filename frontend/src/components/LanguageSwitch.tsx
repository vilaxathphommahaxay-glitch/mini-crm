import { LOCALES, setLocale, t, useLocale } from '../i18n'

/**
 * Language buttons. The Lao one is written in Lao script so someone who can't read English
 * can still find it.
 */
export function LanguageSwitch({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const locale = useLocale()
  const styles =
    tone === 'dark'
      ? { on: 'bg-slate-700 text-white', off: 'text-slate-400 hover:text-white' }
      : { on: 'bg-indigo-50 text-indigo-700', off: 'text-slate-500 hover:text-slate-800' }
  return (
    <div role="group" aria-label={t('lang.label')} className="inline-flex gap-1">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={`rounded px-2 py-1 text-xs font-medium ${locale === code ? styles.on : styles.off}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
