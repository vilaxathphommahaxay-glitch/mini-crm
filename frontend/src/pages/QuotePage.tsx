import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { useBusinessProfile, useDeal, useDeleteQuote, useQuote, useSaveDeal } from '../api/hooks'
import type { BusinessProfile, Quote } from '../api/types'
import { useCurrentUser } from '../auth/context'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button, ButtonLink } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { ConfirmDialog } from '../components/ui/Modal'
import { ErrorState, LoadingState } from '../components/ui/states'
import { formatDate, formatMoney } from '../lib/format'
import { asTyped } from '../lib/money'
import { quoteWhatsappLink } from '../lib/quoteText'
import { NotFoundPage } from './NotFoundPage'
import { t } from '../i18n'

export function QuotePage() {
  const id = Number(useParams().id)
  const quote = useQuote(id)
  const business = useBusinessProfile()

  if (quote.isPending) return <LoadingState />
  if (quote.error instanceof ApiError && quote.error.status === 404) return <NotFoundPage />
  if (quote.isError) return <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
  return <QuoteView quote={quote.data} business={business.data} />
}

function QuoteView({ quote, business }: { quote: Quote; business?: BusinessProfile }) {
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useCurrentUser().role === 'admin'
  const deal = useDeal(quote.deal.id)
  const saveDeal = useSaveDeal()
  const remove = useDeleteQuote()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dealDiffers =
    deal.data && (deal.data.value !== quote.total || deal.data.currency !== quote.currency)

  async function applyTotalToDeal() {
    try {
      await saveDeal.mutateAsync({
        id: quote.deal.id,
        body: { value: quote.total, currency: quote.currency },
      })
      toast.success(t('quote.dealValueUpdated'))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function onDelete() {
    try {
      await remove.mutateAsync(quote.id)
      toast.success(t('quote.deleted'))
      navigate(`/deals/${quote.deal.id}`, { replace: true })
    } catch (error) {
      setConfirmDelete(false)
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <div className="mb-4 space-y-3 print:hidden">
        <Link
          to={`/deals/${quote.deal.id}`}
          className="text-sm text-slate-500 hover:text-indigo-600"
        >
          ← {quote.deal.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>
            <Icon name="printer" className="size-4" />
            {t('quote.print')}
          </Button>
          <a
            href={quoteWhatsappLink(quote, business)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass('secondary')}
          >
            <Icon name="chat" className="size-4" />
            {t('quote.sendWhatsapp')}
          </a>
          <ButtonLink to={`/quotes/${quote.id}/edit`} variant="secondary">
            {t('common.edit')}
          </ButtonLink>
          {dealDiffers && (
            <Button variant="secondary" loading={saveDeal.isPending} onClick={applyTotalToDeal}>
              {t('quote.useAsDealValue')}
            </Button>
          )}
          <Button
            variant="dangerGhost"
            className="sm:ml-auto"
            onClick={() => setConfirmDelete(true)}
          >
            {t('quote.delete')}
          </Button>
        </div>
        <p className="text-xs text-slate-500">{t('quote.printHint')}</p>
        {business && !business.name && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t(isAdmin ? 'quote.noBusinessAdmin' : 'quote.noBusinessStaff')}{' '}
            {isAdmin && (
              <Link to="/settings" className="font-medium underline">
                {t('quote.goToSettings')}
              </Link>
            )}
          </div>
        )}
      </div>

      <QuoteDocument quote={quote} business={business} />

      <ConfirmDialog
        open={confirmDelete}
        title={t('quote.deleteTitle')}
        message={t('quote.deleteMessage', { number: quote.number })}
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

/** The printable page. Kept to black, greys and one accent so it prints well in mono too. */
function QuoteDocument({ quote, business }: { quote: Quote; business?: BusinessProfile }) {
  const money = (amount: string) => formatMoney(amount, quote.currency)
  const customer = quote.customer
  const hasDiscount = Number(quote.discount) > 0
  const hasTax = Number(quote.tax) > 0

  return (
    <article
      aria-label={`${t('quote.docTitle')} ${quote.number}`}
      className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header className="grid gap-5 border-b-2 border-indigo-600 pb-5 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-0.5">
          {business?.name && (
            <p className="text-lg font-semibold text-slate-900">{business.name}</p>
          )}
          {business?.address && <p className="whitespace-pre-line">{business.address}</p>}
          {business?.phone && (
            <p>
              {t('quote.tel')} {business.phone}
            </p>
          )}
          {business?.email && <p>{business.email}</p>}
          {business?.tax_id && (
            <p>
              {t('quote.taxId')}: {business.tax_id}
            </p>
          )}
        </div>
        <div className="sm:text-right print:text-right">
          <h1 className="text-2xl font-semibold tracking-wide text-indigo-700 uppercase">
            {t('quote.docTitle')}
          </h1>
          <dl className="mt-2 grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5 sm:justify-end print:justify-end">
            <DocTerm label={t('quote.number')}>{quote.number}</DocTerm>
            <DocTerm label={t('quote.issueDate')}>{formatDate(quote.issue_date)}</DocTerm>
            {quote.valid_until && (
              <DocTerm label={t('quote.validUntil')}>{formatDate(quote.valid_until)}</DocTerm>
            )}
          </dl>
        </div>
      </header>

      <section className="mt-5">
        <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {t('quote.billTo')}
        </h2>
        <p className="mt-1 font-semibold text-slate-900">{customer.name}</p>
        {customer.company_name && <p>{customer.company_name}</p>}
        {customer.company_address && (
          <p className="whitespace-pre-line">{customer.company_address}</p>
        )}
        {(customer.phone || customer.company_phone) && (
          <p>
            {t('quote.tel')} {customer.phone || customer.company_phone}
          </p>
        )}
        {customer.email && <p>{customer.email}</p>}
      </section>

      {/* phones: one block per line; wider screens and paper: the usual table */}
      <ol className="mt-6 divide-y divide-slate-100 border-y border-slate-200 sm:hidden print:hidden">
        {quote.items.map((item, index) => (
          <li key={item.id} className="py-2.5">
            <p className="whitespace-pre-line">
              <span className="mr-2 text-slate-500 tabular-nums">{index + 1}.</span>
              {item.description}
            </p>
            <p className="mt-0.5 flex justify-between gap-3 text-slate-600 tabular-nums">
              <span>
                {asTyped(item.quantity)} × {money(item.unit_price)}
              </span>
              <span className="font-medium whitespace-nowrap text-slate-900">
                {money(item.amount)}
              </span>
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-6 hidden sm:block print:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
              <th scope="col" className="w-8 py-2 pr-2 font-medium">
                #
              </th>
              <th scope="col" className="py-2 pr-2 font-medium">
                {t('quote.description')}
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                {t('quote.quantity')}
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                {t('quote.unitPrice')}
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {t('quote.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-100 align-top break-inside-avoid">
                <td className="py-2 pr-2 text-slate-500 tabular-nums">{index + 1}</td>
                <td className="py-2 pr-2 whitespace-pre-line">{item.description}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{asTyped(item.quantity)}</td>
                <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums">
                  {money(item.unit_price)}
                </td>
                <td className="py-2 text-right whitespace-nowrap tabular-nums">
                  {money(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 ml-auto max-w-xs space-y-1 tabular-nums break-inside-avoid">
        {(hasDiscount || hasTax) && (
          <DocTotal label={t('quote.subtotal')}>{money(quote.subtotal)}</DocTotal>
        )}
        {hasDiscount && <DocTotal label={t('quote.discount')}>-{money(quote.discount)}</DocTotal>}
        {hasTax && (
          <DocTotal label={t('quote.tax', { rate: asTyped(quote.tax_rate) })}>
            {money(quote.tax)}
          </DocTotal>
        )}
        <div className="flex justify-between gap-4 border-t-2 border-slate-800 pt-2 text-base font-semibold text-slate-900">
          <dt>{t('quote.total')}</dt>
          <dd className="whitespace-nowrap">{money(quote.total)}</dd>
        </div>
      </dl>

      {quote.notes && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t('quote.notes')}
          </h2>
          <p className="mt-1 whitespace-pre-line">{quote.notes}</p>
        </section>
      )}
      {business?.quote_terms && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t('quote.terms')}
          </h2>
          <p className="mt-1 whitespace-pre-line">{business.quote_terms}</p>
        </section>
      )}

      <footer className="mt-12 grid gap-10 break-inside-avoid sm:grid-cols-2 print:grid-cols-2">
        <Signature label={t('quote.preparedBy')} name={quote.prepared_by.name} />
        <Signature label={t('quote.acceptedBy')} name={customer.name} />
      </footer>
    </article>
  )
}

function DocTerm({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 tabular-nums">{children}</dd>
    </>
  )
}

function DocTotal({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-slate-600">
      <dt>{label}</dt>
      <dd className="whitespace-nowrap">{children}</dd>
    </div>
  )
}

function Signature({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-12 border-b border-slate-400" />
      <p className="mt-1 font-medium text-slate-900">{name}</p>
      <p className="text-xs text-slate-500">{t('quote.signature')}</p>
    </div>
  )
}
