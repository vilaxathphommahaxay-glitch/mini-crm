// Form schemas. Form fields are always strings (or booleans); `to*Body` converts them to the
// API's shape (nulls for blanks, numbers for ids).
import { z } from 'zod'
import type { ActivityType, Currency, Stage } from '../api/types'
import { msg, type MessageKey } from '../i18n'
import { toCents } from '../lib/money'

const optionalText = (max: number) => z.string().trim().max(max, msg('validation.maxChars', max))
const requiredText = (required: MessageKey, max: number) =>
  z.string().trim().min(1, msg(required)).max(max, msg('validation.maxChars', max))

const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim())
const idOrNull = (value: string) => (value ? Number(value) : null)

const emailField = z
  .string()
  .trim()
  .refine((v) => v === '' || z.email().safeParse(v).success, msg('validation.email'))

/** "VIP, wholesale,vip" -> ["vip", "wholesale"] (same rules as the backend). */
export function parseTags(input: string): string[] {
  const tags = input
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(tags)]
}

/** owner_id is only sent by admins, and only when chosen. */
function ownerPart(ownerId: string) {
  return ownerId ? { owner_id: Number(ownerId) } : {}
}

// --- contact ---
export const NEW_COMPANY = 'new' // the "+ New company…" choice in the company select

export const contactSchema = z
  .object({
    first_name: requiredText('validation.firstNameRequired', 100),
    last_name: optionalText(100),
    email: emailField,
    phone: optionalText(50),
    company_id: z.string(),
    company_name: optionalText(200),
    tags: z
      .string()
      .refine((v) => parseTags(v).every((t) => t.length <= 50), msg('validation.tagsTooLong')),
    notes: z.string(),
    owner_id: z.string(),
  })
  .refine((v) => v.company_id !== NEW_COMPANY || v.company_name.trim() !== '', {
    path: ['company_name'],
    message: msg('validation.newCompanyName'),
  })
export type ContactFormValues = z.infer<typeof contactSchema>

export function toContactBody(v: ContactFormValues) {
  return {
    first_name: v.first_name.trim(),
    last_name: blankToNull(v.last_name),
    email: blankToNull(v.email),
    phone: blankToNull(v.phone),
    // a new company is sent by name; the API reuses one with that name if it already exists
    ...(v.company_id === NEW_COMPANY
      ? { company_name: v.company_name.trim() }
      : { company_id: idOrNull(v.company_id) }),
    tags: parseTags(v.tags),
    notes: blankToNull(v.notes),
    ...ownerPart(v.owner_id),
  }
}

// --- company ---
export const companySchema = z.object({
  name: requiredText('validation.nameRequired', 200),
  phone: optionalText(50),
  website: optionalText(255),
  address: z.string(),
  notes: z.string(),
  owner_id: z.string(),
})
export type CompanyFormValues = z.infer<typeof companySchema>

export function toCompanyBody(v: CompanyFormValues) {
  return {
    name: v.name.trim(),
    phone: blankToNull(v.phone),
    website: blankToNull(v.website),
    address: blankToNull(v.address),
    notes: blankToNull(v.notes),
    ...ownerPart(v.owner_id),
  }
}

// --- deal ---
const MONEY = /^\d{1,16}(\.\d{1,2})?$/

export const dealSchema = z.object({
  title: requiredText('validation.titleRequired', 200),
  // commas allowed while typing: "1,500,000"
  value: z
    .string()
    .trim()
    .min(1, msg('validation.valueRequired'))
    .refine((v) => MONEY.test(v.replaceAll(',', '')), msg('validation.valueFormat')),
  currency: z.enum(['LAK', 'THB', 'USD']),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  contact_id: z.string().min(1, msg('validation.chooseContact')),
  company_id: z.string(),
  expected_close_date: z.string(),
  owner_id: z.string(),
})
export type DealFormValues = z.infer<typeof dealSchema>

export function toDealBody(v: DealFormValues, isNew: boolean) {
  return {
    title: v.title.trim(),
    value: v.value.replaceAll(',', '').trim(),
    currency: v.currency as Currency,
    contact_id: Number(v.contact_id),
    company_id: idOrNull(v.company_id),
    expected_close_date: v.expected_close_date || null,
    // stage only on create; later changes go through the pipeline move endpoint
    ...(isNew ? { stage: v.stage as Stage } : {}),
    ...ownerPart(v.owner_id),
  }
}

// --- activity ---
export const activitySchema = z
  .object({
    type: z.enum(['call', 'meeting', 'note', 'task']),
    subject: requiredText('validation.subjectRequired', 200),
    description: z.string(),
    due_date: z.string(),
    done: z.boolean(),
    contact_id: z.string(),
    deal_id: z.string(),
    owner_id: z.string(),
    // optional next step created together with a logged call/meeting/note
    follow_up: z.boolean(),
    follow_up_subject: optionalText(200),
    follow_up_date: z.string(),
  })
  .refine((v) => !v.follow_up || v.follow_up_subject.trim() !== '', {
    path: ['follow_up_subject'],
    message: msg('validation.nextStep'),
  })
  .refine((v) => !v.follow_up || v.follow_up_date !== '', {
    path: ['follow_up_date'],
    message: msg('validation.pickDate'),
  })
export type ActivityFormValues = z.infer<typeof activitySchema>

export function toActivityBody(v: ActivityFormValues) {
  return {
    type: v.type as ActivityType,
    subject: v.subject.trim(),
    description: blankToNull(v.description),
    due_date: v.due_date || null,
    done: v.done,
    contact_id: idOrNull(v.contact_id),
    deal_id: idOrNull(v.deal_id),
    ...ownerPart(v.owner_id),
  }
}

/** The follow-up task that goes with a logged activity, or null. */
export function toFollowUpBody(v: ActivityFormValues) {
  if (!v.follow_up || v.type === 'task') return null
  return {
    type: 'task' as ActivityType,
    subject: v.follow_up_subject.trim(),
    due_date: v.follow_up_date,
    contact_id: idOrNull(v.contact_id),
    deal_id: idOrNull(v.deal_id),
    ...ownerPart(v.owner_id),
  }
}

// --- quote ---
const plainAmount = (v: string) => v.replaceAll(',', '').trim()

export const quoteSchema = z.object({
  items: z
    .array(
      z.object({
        description: requiredText('validation.descriptionRequired', 500),
        quantity: z.string().refine((v) => {
          const cents = toCents(v)
          return cents !== null && cents > 0n && cents < 10n ** 12n
        }, msg('validation.quantity')),
        unit_price: z.string().refine((v) => toCents(v) !== null, msg('validation.amount')),
      }),
    )
    .min(1),
  discount: z.string().refine((v) => !v.trim() || toCents(v) !== null, msg('validation.amount')),
  tax_rate: z.string().refine((v) => {
    if (!v.trim()) return true
    const hundredths = toCents(v)
    return hundredths !== null && hundredths <= 10000n
  }, msg('validation.percent')),
  issue_date: z.string().min(1, msg('validation.pickDate')),
  valid_until: z.string(),
  notes: z.string().max(5000, msg('validation.maxChars', 5000)),
})
export type QuoteFormValues = z.infer<typeof quoteSchema>

export function toQuoteBody(v: QuoteFormValues) {
  return {
    items: v.items.map((item) => ({
      description: item.description.trim(),
      quantity: plainAmount(item.quantity),
      unit_price: plainAmount(item.unit_price),
    })),
    discount: plainAmount(v.discount) || '0',
    tax_rate: plainAmount(v.tax_rate) || '0',
    issue_date: v.issue_date,
    valid_until: v.valid_until || null,
    notes: blankToNull(v.notes),
  }
}
