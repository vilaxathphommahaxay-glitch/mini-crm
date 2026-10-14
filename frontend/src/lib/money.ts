// Exact money arithmetic in whole cents (BigInt), so the totals shown while typing a quote are
// the same as the ones the server will calculate - no floating-point surprises on big LAK sums.

const AMOUNT = /^\d{1,16}(\.\d{1,2})?$/

/** "1,500,000.5" -> 150000050n; null when it isn't a plain non-negative amount. */
export function toCents(input: string): bigint | null {
  const text = input.replaceAll(',', '').trim()
  if (!AMOUNT.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

/** 150000050n -> "1500000.50" (the API's money format). */
export function fromCents(cents: bigint): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  const fraction = String(abs % 100n).padStart(2, '0')
  return `${negative ? '-' : ''}${abs / 100n}.${fraction}`
}

/** a / b rounded half up, for non-negative a and positive b (like Python's ROUND_HALF_UP). */
function divideRounded(a: bigint, b: bigint): bigint {
  return (a * 2n + b) / (2n * b)
}

/** quantity × unit price, both in cents, rounded to cents. */
export function lineCents(quantity: bigint, unitPrice: bigint): bigint {
  return divideRounded(quantity * unitPrice, 100n)
}

export interface QuoteTotals {
  subtotal: bigint
  discount: bigint
  tax: bigint
  total: bigint
}

/** Same rules as the backend: tax is charged on the subtotal after the discount. */
export function quoteTotals(
  lines: { quantity: string; unit_price: string }[],
  discount: string,
  taxRate: string,
): QuoteTotals {
  const subtotal = lines.reduce((sum, line) => {
    const qty = toCents(line.quantity)
    const price = toCents(line.unit_price)
    return qty === null || price === null ? sum : sum + lineCents(qty, price)
  }, 0n)
  const off = toCents(discount || '0') ?? 0n
  const rate = toCents(taxRate || '0') ?? 0n // percent, in hundredths
  const taxable = subtotal - off
  const tax = taxable > 0n ? divideRounded(taxable * rate, 10000n) : 0n
  return { subtotal, discount: off, tax, total: taxable + tax }
}

/** "1500000.00" -> "1500000", "2.50" -> "2.5": an API amount the way a person would type it. */
export function asTyped(amount: string): string {
  return amount.includes('.') ? amount.replace(/0+$/, '').replace(/\.$/, '') : amount
}
