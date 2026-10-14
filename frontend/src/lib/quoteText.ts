import type { BusinessProfile, Quote } from '../api/types'
import { t } from '../i18n'
import { formatDate, formatMoney } from './format'
import { asTyped } from './money'
import { whatsappNumber } from './phone'

/** The quote as a WhatsApp message: readable on a phone without opening any file. */
export function quoteMessage(quote: Quote, business: BusinessProfile | undefined): string {
  const money = (amount: string) => formatMoney(amount, quote.currency)
  const lines = [`*${t('quote.docTitle')} ${quote.number}*`]
  if (business?.name) lines.push(business.name)
  lines.push('')
  for (const item of quote.items) {
    lines.push(
      `• ${item.description}: ${asTyped(item.quantity)} × ${money(item.unit_price)} = ${money(item.amount)}`,
    )
  }
  lines.push('')
  if (Number(quote.discount) > 0 || Number(quote.tax) > 0) {
    lines.push(`${t('quote.subtotal')}: ${money(quote.subtotal)}`)
  }
  if (Number(quote.discount) > 0) lines.push(`${t('quote.discount')}: -${money(quote.discount)}`)
  if (Number(quote.tax) > 0) {
    lines.push(`${t('quote.tax', { rate: asTyped(quote.tax_rate) })}: ${money(quote.tax)}`)
  }
  lines.push(`*${t('quote.total')}: ${money(quote.total)}*`)
  if (quote.valid_until) {
    lines.push(`${t('quote.validUntil')}: ${formatDate(quote.valid_until)}`)
  }
  if (quote.notes) lines.push('', quote.notes)
  return lines.join('\n')
}

/** wa.me link with the message filled in; without a number WhatsApp asks who to send it to. */
export function quoteWhatsappLink(quote: Quote, business: BusinessProfile | undefined): string {
  const number =
    whatsappNumber(quote.customer.phone) ?? whatsappNumber(quote.customer.company_phone) ?? ''
  return `https://wa.me/${number}?text=${encodeURIComponent(quoteMessage(quote, business))}`
}
