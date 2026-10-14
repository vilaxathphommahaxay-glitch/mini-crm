// TanStack Query hooks for every resource. Query keys start with the resource name so a
// mutation can invalidate everything about that resource with one call.
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { api } from './client'
import type {
  Activity,
  Attachment,
  AttachmentEntity,
  BusinessProfile,
  BoardColumn,
  Company,
  Contact,
  DashboardSummary,
  Deal,
  DuplicateGroup,
  HistoryEvent,
  Page,
  Quote,
  QuoteSummary,
  Reminders,
  SearchResults,
  Stage,
  TeamMember,
  User,
} from './types'

type Params = Record<string, string | number | boolean | null | undefined>
type Body = Record<string, unknown>

function useList<T>(resource: string, params: Params, enabled = true) {
  return useQuery({
    queryKey: [resource, 'list', params],
    queryFn: () => api<Page<T>>(`/${resource}`, { query: params }),
    placeholderData: keepPreviousData, // keep the table on screen while the next page loads
    enabled,
  })
}

function useOne<T>(resource: string, id: number | undefined) {
  return useQuery({
    queryKey: [resource, 'detail', id],
    queryFn: () => api<T>(`/${resource}/${id}`),
    enabled: id !== undefined && !Number.isNaN(id),
  })
}

/** Mutations that touch one resource also refresh whatever views depend on it. */
const DEPENDENTS: Record<string, string[]> = {
  contacts: ['contacts', 'tags', 'deals', 'activities', 'dashboard', 'quotes', 'history'],
  companies: ['companies', 'contacts', 'deals', 'quotes', 'history'],
  deals: ['deals', 'activities', 'dashboard', 'quotes', 'history'],
  quotes: ['quotes', 'history'],
  activities: ['activities', 'dashboard', 'history'],
  users: ['users', 'history'],
}

function useInvalidate() {
  const client = useQueryClient()
  return (resource: string) =>
    Promise.all(
      (DEPENDENTS[resource] ?? [resource]).map((key) =>
        client.invalidateQueries({ queryKey: [key] as QueryKey }),
      ),
    )
}

function useSave<T>(resource: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Body }) =>
      id === undefined
        ? api<T>(`/${resource}`, { method: 'POST', body })
        : api<T>(`/${resource}/${id}`, { method: 'PATCH', body }),
    onSuccess: () => invalidate(resource),
  })
}

function useDelete(resource: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/${resource}/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(resource),
  })
}

// --- contacts / companies / tags ---
export const useContacts = (params: Params, enabled = true) =>
  useList<Contact>('contacts', params, enabled)
export const useContact = (id?: number) => useOne<Contact>('contacts', id)
export const useSaveContact = () => useSave<Contact>('contacts')
export const useDeleteContact = () => useDelete('contacts')

export const useCompanies = (params: Params) => useList<Company>('companies', params)
export const useCompany = (id?: number) => useOne<Company>('companies', id)
export const useSaveCompany = () => useSave<Company>('companies')
export const useDeleteCompany = () => useDelete('companies')

export function useDuplicates(ownerId?: number) {
  return useQuery({
    queryKey: ['contacts', 'duplicates', ownerId ?? null],
    queryFn: () => api<DuplicateGroup[]>('/contacts/duplicates', { query: { owner_id: ownerId } }),
  })
}

/** Fold `otherId` into `keepId` (its deals, activities, files and tags move over). */
export function useMergeContacts() {
  const invalidate = useInvalidate()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ keepId, otherId }: { keepId: number; otherId: number }) =>
      api<Contact>(`/contacts/${keepId}/merge`, { method: 'POST', body: { other_id: otherId } }),
    onSuccess: () =>
      Promise.all([
        invalidate('contacts'),
        client.invalidateQueries({ queryKey: ['attachments'] }),
      ]),
  })
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: () => api<string[]>('/tags') })
}

// --- deals ---
export const useDeals = (params: Params) => useList<Deal>('deals', params)
export const useDeal = (id?: number) => useOne<Deal>('deals', id)
export const useSaveDeal = () => useSave<Deal>('deals')
export const useDeleteDeal = () => useDelete('deals')

export function useBoard(ownerId?: number) {
  return useQuery({
    queryKey: ['deals', 'board', ownerId ?? null],
    queryFn: () => api<BoardColumn[]>('/deals/board', { query: { owner_id: ownerId } }),
  })
}

export function moveDeal(id: number, stage: Stage, beforeId: number | null) {
  return api<Deal>(`/deals/${id}/move`, {
    method: 'PATCH',
    body: { stage, before_id: beforeId },
  })
}

// --- quotes ---
export function useDealQuotes(dealId: number) {
  return useQuery({
    queryKey: ['quotes', 'deal', dealId],
    queryFn: () => api<QuoteSummary[]>(`/deals/${dealId}/quotes`),
  })
}

export const useQuote = (id?: number) => useOne<Quote>('quotes', id)

/** New quotes are created on their deal; existing ones are replaced as a whole (PUT). */
export function useSaveQuote() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, dealId, body }: { id?: number; dealId: number; body: Body }) =>
      id === undefined
        ? api<Quote>(`/deals/${dealId}/quotes`, { method: 'POST', body })
        : api<Quote>(`/quotes/${id}`, { method: 'PUT', body }),
    onSuccess: () => invalidate('quotes'),
  })
}

export const useDeleteQuote = () => useDelete('quotes')

export function useBusinessProfile() {
  return useQuery({
    queryKey: ['business'],
    queryFn: () => api<BusinessProfile>('/settings/business'),
    staleTime: 5 * 60_000,
  })
}

export function useSaveBusinessProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: BusinessProfile) =>
      api<BusinessProfile>('/settings/business', { method: 'PUT', body: { ...body } }),
    onSuccess: (saved) => client.setQueryData(['business'], saved),
  })
}

// --- activities ---
export const useActivities = (params: Params, enabled = true) =>
  useList<Activity>('activities', params, enabled)
export const useSaveActivity = () => useSave<Activity>('activities')
export const useDeleteActivity = () => useDelete('activities')

/** Polled so the badge stays right when the tab is left open past midnight or all day. */
export function useReminders() {
  return useQuery({
    queryKey: ['activities', 'reminders'],
    queryFn: () => api<Reminders>('/activities/reminders'),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: false, // a missing badge is harmless; don't hammer the server for it
  })
}

// --- attached files ---
export function useAttachments(entityType: AttachmentEntity, entityId: number) {
  return useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () =>
      api<Attachment[]>('/attachments', {
        query: { entity_type: entityType, entity_id: entityId },
      }),
  })
}

export function useUploadAttachment(entityType: AttachmentEntity, entityId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('entity_type', entityType)
      form.append('entity_id', String(entityId))
      form.append('file', file)
      return api<Attachment>('/attachments', { method: 'POST', body: form })
    },
    onSettled: () =>
      Promise.all(
        ['attachments', 'history'].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ),
  })
}

export function useDeleteAttachment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      Promise.all(
        ['attachments', 'history'].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ),
  })
}

/** The file's bytes (sent with the sign-in token, so it can't be a plain link). */
export async function fetchAttachment(id: number): Promise<Blob> {
  const response = await api<Response>(`/attachments/${id}/file`, { raw: true })
  return response.blob()
}

// --- edit history ---
export const useHistory = (params: Params, enabled = true) =>
  useList<HistoryEvent>('history', params, enabled)

// --- users (admin) ---
export const useUsers = (params: Params, enabled = true) => useList<User>('users', params, enabled)
export const useSaveUser = () => useSave<User>('users')

// --- dashboard ---
export function useDashboard(ownerId?: number, allWithoutNextStep = false) {
  const limit = allWithoutNextStep ? 200 : undefined
  return useQuery({
    queryKey: ['dashboard', ownerId ?? null, limit ?? null],
    queryFn: () =>
      api<DashboardSummary>('/dashboard/summary', {
        query: { owner_id: ownerId, no_next_step_limit: limit },
      }),
    // Expanding the list keeps the page on screen, but another person's numbers must never
    // stand in for the one just selected.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === (ownerId ?? null) ? previous : undefined,
  })
}

// --- global search (Ctrl+K) ---
export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api<SearchResults>('/search', { query: { q } }),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData, // no flicker between keystrokes
    staleTime: 10_000,
  })
}

export function useTeam(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'team'],
    queryFn: () => api<TeamMember[]>('/dashboard/team'),
    enabled,
  })
}
