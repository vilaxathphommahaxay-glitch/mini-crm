/** Laos. Numbers written the local way ("020 5555 1234") get this country code. */
export const DEFAULT_COUNTRY_CODE = '856'

/**
 * A phone number as WhatsApp wants it (country code + number, digits only), or null if it
 * doesn't look like a phone number.
 *   "+856 20 5555 1234" -> "8562055551234"
 *   "020 5555 1234"     -> "8562055551234"   (local format: leading 0 becomes 856)
 *   "00 66 81 234 5678" -> "66812345678"     (international prefix 00)
 *   "20 5555 1234"      -> "8562055551234"   (no prefix at all)
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const text = (phone ?? '').trim()
  let digits = text.replace(/\D/g, '')
  if (!digits) return null
  if (text.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1)
  } else if (!digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    digits = DEFAULT_COUNTRY_CODE + digits
  }
  return digits.length >= 9 && digits.length <= 15 ? digits : null
}

export function whatsappLink(phone: string | null | undefined): string | null {
  const number = whatsappNumber(phone)
  return number ? `https://wa.me/${number}` : null
}

/** tel: link that keeps a leading + and digits only. */
export function telLink(phone: string): string {
  return `tel:${phone.trim().replace(/(?!^\+)[^\d]/g, '')}`
}
