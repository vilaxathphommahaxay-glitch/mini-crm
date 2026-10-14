import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useDeal, useQuote, useSaveQuote } from '../api/hooks'
import type { Currency, Quote } from '../api/types'
import { Icon } from '../components/icons'
import { useToast } from '../components/toast/context'
import { Button, ButtonLink } from '../components/ui/Button'
import { Field, FormError, Input, Textarea } from '../components/ui/form'
import { Card, CardHeader, PageHeader } from '../components/ui/layout'
import { ErrorState, LoadingState } from '../components/ui/states'
import { quoteSchema, toQuoteBody, type QuoteFormValues } from '../forms/schemas'
import { applyServerErrors } from '../forms/serverErrors'
import { addDaysISO, formatMoney, todayISO } from '../lib/format'
import { asTyped, fromCents, lineCents, quoteTotals, toCents } from '../lib/money'
import { NotFoundPage } from './NotFoundPage'
import { tr, t } from '../i18n'

const DEFAULT_VALID_DAYS = 30

interface EditorProps {
  dealId: number
  dealTitle: string
  currency: Currency
  defaults: QuoteFormValues
  quote?: Quote
}

/** New quote for a deal: /deals/:dealId/quotes/new */
export function NewQuotePage() {
  const dealId = Number(useParams().dealId)
  const deal = useDeal(dealId)
  if (deal.isPending) return <LoadingState />
  if (deal.error instanceof ApiError && deal.error.status === 404) return <NotFoundPage />
  if (deal.isError) return <ErrorState error={deal.error} onRetry={() => deal.refetch()} />
  const d = deal.data
  return (
    <QuoteEditor
      dealId={d.id}
      dealTitle={d.title}
      currency={d.currency}
      defaults={{
        // start from the deal: one line with its title and value, ready to adjust
        items: [{ description: d.title, quantity: '1', unit_price: asTyped(d.value) }],
        discount: '0',
        tax_rate: '0',
        issue_date: todayISO(),
        valid_until: addDaysISO(DEFAULT_VALID_DAYS),
        notes: '',
      }}
    />
  )
}

/** Existing quote: /quotes/:id/edit */
export function EditQuotePage() {
  const id = Number(useParams().id)
  const quote = useQuote(id)
  if (quote.isPending) return <LoadingState />
  if (quote.error instanceof ApiError && quote.error.status === 404) return <NotFoundPage />
  if (quote.isError) return <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
  const q = quote.data
  return (
    <QuoteEditor
      key={q.updated_at}
      quote={q}
      dealId={q.deal.id}
      dealTitle={q.deal.title}
      currency={q.currency}
      defaults={{
        items: q.items.map((item) => ({
          description: item.description,
          quantity: asTyped(item.quantity),
          unit_price: asTyped(item.unit_price),
        })),
        discount: asTyped(q.discount) || '0',
        tax_rate: asTyped(q.tax_rate) || '0',
        issue_date: q.issue_date,
        valid_until: q.valid_until ?? '',
        notes: q.notes ?? '',
      }}
    />
  )
}

function QuoteEditor({ dealId, dealTitle, currency, defaults, quote }: EditorProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveQuote()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<QuoteFormValues>({ resolver: zodResolver(quoteSchema), defaultValues: defaults })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const [items, discount, taxRate] = useWatch({
    control,
    name: ['items', 'discount', 'tax_rate'],
  })
  const totals = quoteTotals(items, discount, taxRate)
  const money = (cents: bigint) => formatMoney(fromCents(cents), currency)
  const backTo = quote ? `/quotes/${quote.id}` : `/deals/${dealId}`

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await save.mutateAsync({ id: quote?.id, dealId, body: toQuoteBody(values) })
      toast.success(quote ? t('quote.saved') : t('quote.created', { number: saved.number }))
      navigate(`/quotes/${saved.id}`, { replace: !quote })
    } catch (error) {
      const known = [
        'discount',
        'tax_rate',
        'issue_date',
        'valid_until',
        'notes',
        ...values.items.flatMap((_, i) =>
          ['description', 'quantity', 'unit_price'].map((f) => `items.${i}.${f}`),
        ),
      ]
      setFormError(applyServerErrors(error, setError, known))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={quote ? `${t('quote.edit')} ${quote.number}` : t('quote.new')}
        subtitle={
          <Link to={`/deals/${dealId}`} className="hover:text-indigo-600">
            {dealTitle}
          </Link>
        }
      />
      <div className="space-y-6">
        <FormError message={formError} />
        <Card>
          <CardHeader title={t('quote.items')} />
          <div className="space-y-3 p-4">
            {/* column headings for wide screens; on phones each line has its own labels */}
            <div
              aria-hidden="true"
              className="hidden gap-2 text-xs font-medium text-slate-500 sm:grid sm:grid-cols-[1fr_6rem_9rem_9rem_2.25rem]"
            >
              <span>{t('quote.description')}</span>
              <span>{t('quote.quantity')}</span>
              <span>{t('quote.unitPrice')}</span>
              <span className="text-right">{t('quote.amount')}</span>
              <span />
            </div>
            {fields.map((field, index) => {
              const n = index + 1
              const line = items[index]
              const qty = toCents(line?.quantity ?? '')
              const price = toCents(line?.unit_price ?? '')
              const lineErrors = errors.items?.[index]
              return (
                <fieldset
                  key={field.id}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_6rem_9rem_9rem_2.25rem] sm:items-start sm:border-0 sm:p-0"
                >
                  <legend className="sr-only">{t('quote.item', { n })}</legend>
                  <LineInput
                    className="col-span-3 sm:col-span-1"
                    label={`${t('quote.description')} ${n}`}
                    shortLabel={t('quote.description')}
                    error={lineErrors?.description?.message}
                  >
                    {(c) => (
                      <Textarea
                        {...c}
                        {...register(`items.${index}.description`)}
                        rows={1}
                        className="min-h-0 sm:min-h-[2.375rem]"
                      />
                    )}
                  </LineInput>
                  <LineInput
                    label={`${t('quote.quantity')} ${n}`}
                    shortLabel={t('quote.quantity')}
                    error={lineErrors?.quantity?.message}
                  >
                    {(c) => (
                      <Input
                        {...c}
                        {...register(`items.${index}.quantity`)}
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    )}
                  </LineInput>
                  <LineInput
                    label={`${t('quote.unitPrice')} ${n}`}
                    shortLabel={t('quote.unitPrice')}
                    error={lineErrors?.unit_price?.message}
                  >
                    {(c) => (
                      <Input
                        {...c}
                        {...register(`items.${index}.unit_price`)}
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    )}
                  </LineInput>
                  <p className="col-span-2 self-center text-sm text-slate-900 tabular-nums sm:col-span-1 sm:py-2 sm:text-right">
                    <span className="text-slate-500 sm:hidden">{t('quote.amount')}: </span>
                    {qty !== null && price !== null ? money(lineCents(qty, price)) : '—'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-center justify-self-end sm:mt-0.5"
                    aria-label={t('quote.removeItem', { n })}
                    title={t('quote.removeItem', { n })}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Icon name="trash" className="size-4" />
                  </Button>
                </fieldset>
              )
            })}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => append({ description: '', quantity: '1', unit_price: '' })}
            >
              <Icon name="plus" className="size-3.5" />
              {t('quote.addItem')}
            </Button>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('quote.issueDate')} required error={errors.issue_date?.message}>
                  {(c) => <Input {...c} {...register('issue_date')} type="date" />}
                </Field>
                <Field label={t('quote.validUntil')} error={errors.valid_until?.message}>
                  {(c) => <Input {...c} {...register('valid_until')} type="date" />}
                </Field>
              </div>
              <Field
                label={t('quote.notes')}
                hint={t('quote.notesHint')}
                error={errors.notes?.message}
              >
                {(c) => <Textarea {...c} {...register('notes')} rows={4} />}
              </Field>
            </div>
          </Card>
          <Card className="self-start">
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={`${t('quote.discount')} (${t(`currency.${currency}`)})`}
                  error={errors.discount?.message}
                >
                  {(c) => (
                    <Input
                      {...c}
                      {...register('discount')}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field
                  label={t('quote.taxRate')}
                  hint={t('quote.taxRateHint')}
                  error={errors.tax_rate?.message}
                >
                  {(c) => (
                    <Input
                      {...c}
                      {...register('tax_rate')}
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  )}
                </Field>
              </div>
              <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm tabular-nums">
                <TotalRow label={t('quote.subtotal')} value={money(totals.subtotal)} />
                {totals.discount > 0n && (
                  <TotalRow label={t('quote.discount')} value={`-${money(totals.discount)}`} />
                )}
                {totals.tax > 0n && (
                  <TotalRow
                    label={t('quote.tax', { rate: asTyped(taxRate.replaceAll(',', '')) })}
                    value={money(totals.tax)}
                  />
                )}
                <TotalRow label={t('quote.total')} value={money(totals.total)} strong />
              </dl>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <ButtonLink to={backTo} variant="secondary">
            {t('common.cancel')}
          </ButtonLink>
          <Button type="submit" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** A quote line's input: labelled per line for screen readers, short visible label on phones. */
function LineInput({
  label,
  shortLabel,
  error,
  className = '',
  children,
}: {
  label: string
  shortLabel: string
  error?: string
  className?: string
  children: (control: { 'aria-label': string; 'aria-invalid': boolean }) => React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span aria-hidden="true" className="mb-1 block text-xs text-slate-500 sm:hidden">
        {shortLabel}
      </span>
      {children({ 'aria-label': label, 'aria-invalid': Boolean(error) })}
      {error && <span className="mt-1 block text-xs text-red-600">{tr(error)}</span>}
    </label>
  )
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? 'pt-1 text-base font-semibold text-slate-900' : 'text-slate-600'}`}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
