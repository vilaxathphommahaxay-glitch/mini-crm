// Form schemas. Form fields are always strings (or booleans); `to*Body` converts them to the
// API's shape (nulls for blanks, numbers for ids).
import { z } from 'zod'
import type { ActivityType, Currency, Stage } from '../api/types'

const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`)
const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `At most ${max} characters`)

const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim())
const idOrNull = (value: string) => (value ? Number(value) : null)

const emailField = z
  .string()
  .trim()
  .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address')

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
export const contactSchema = z.object({
  first_name: requiredText('First name', 100),
  last_name: optionalText(100),
  email: emailField,
  phone: optionalText(50),
  company_id: z.string(),
  tags: z.string().refine((v) => parseTags(v).every((t) => t.length <= 50), 'Tags are too long'),
  notes: z.string(),
  owner_id: z.string(),
})
export type ContactFormValues = z.infer<typeof contactSchema>

export function toContactBody(v: ContactFormValues) {
  return {
    first_name: v.first_name.trim(),
    last_name: blankToNull(v.last_name),
    email: blankToNull(v.email),
    phone: blankToNull(v.phone),
    company_id: idOrNull(v.company_id),
    tags: parseTags(v.tags),
    notes: blankToNull(v.notes),
    ...ownerPart(v.owner_id),
  }
}

// --- company ---
export const companySchema = z.object({
  name: requiredText('Name', 200),
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
  title: requiredText('Title', 200),
  // commas allowed while typing: "1,500,000"
  value: z
    .string()
    .trim()
    .min(1, 'Value is required')
    .refine((v) => MONEY.test(v.replaceAll(',', '')), 'Enter an amount like 1500000 or 99.50'),
  currency: z.enum(['LAK', 'THB', 'USD']),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  contact_id: z.string().min(1, 'Choose a contact'),
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
export const activitySchema = z.object({
  type: z.enum(['call', 'meeting', 'note', 'task']),
  subject: requiredText('Subject', 200),
  description: z.string(),
  due_date: z.string(),
  done: z.boolean(),
  contact_id: z.string(),
  deal_id: z.string(),
  owner_id: z.string(),
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
