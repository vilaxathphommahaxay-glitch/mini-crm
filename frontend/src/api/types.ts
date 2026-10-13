// Mirrors the backend response schemas (backend/app/schemas).

export type Role = 'admin' | 'staff'
export type Currency = 'LAK' | 'THB' | 'USD'
export type Stage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type ActivityType = 'call' | 'meeting' | 'note' | 'task'
export type Due = 'overdue' | 'today' | 'upcoming'

export const CURRENCIES: Currency[] = ['LAK', 'THB', 'USD']
export const STAGES: Stage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
export const ACTIVITY_TYPES: ActivityType[] = ['call', 'meeting', 'note', 'task']

export const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
}

export interface Ref {
  id: number
  name: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface Company {
  id: number
  name: string
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  owner: Ref
  created_at: string
  updated_at: string
}

export interface Contact {
  id: number
  first_name: string
  last_name: string | null
  full_name: string
  email: string | null
  phone: string | null
  notes: string | null
  company: Ref | null
  tags: string[]
  owner: Ref
  created_at: string
  updated_at: string
}

export interface Deal {
  id: number
  title: string
  value: string // decimal as string, e.g. "1500000.00"
  currency: Currency
  stage: Stage
  position: number
  contact: Ref
  company: Ref | null
  owner: Ref
  expected_close_date: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface CurrencyTotal {
  currency: Currency
  amount: string
}

export interface BoardColumn {
  stage: Stage
  count: number
  totals: CurrencyTotal[]
  deals: Deal[]
}

export interface Activity {
  id: number
  type: ActivityType
  subject: string
  description: string | null
  due_date: string | null
  done: boolean
  completed_at: string | null
  contact: Ref | null
  deal: { id: number; title: string } | null
  owner: Ref
  created_at: string
  updated_at: string
}

export interface DashboardSummary {
  open_deals: number
  pipeline: { stage: Stage; count: number; totals: CurrencyTotal[] }[]
  won_by_month: { month: string; totals: CurrencyTotal[] }[]
  tasks: { overdue: number; today: number; upcoming: number; overdue_items: Activity[] }
}

export interface ImportResult {
  created: number
  skipped: number
  errors: { row: number; message: string }[]
}
