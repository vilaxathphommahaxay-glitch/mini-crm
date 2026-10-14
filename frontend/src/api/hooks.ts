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
  BoardColumn,
  Company,
  Contact,
  DashboardSummary,
  Deal,
  Page,
  SearchResults,
  Stage,
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
  contacts: ['contacts', 'tags', 'deals', 'activities', 'dashboard'],
  companies: ['companies', 'contacts', 'deals'],
  deals: ['deals', 'activities', 'dashboard'],
  activities: ['activities', 'dashboard'],
  users: ['users'],
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
export const useContacts = (params: Params) => useList<Contact>('contacts', params)
export const useContact = (id?: number) => useOne<Contact>('contacts', id)
export const useSaveContact = () => useSave<Contact>('contacts')
export const useDeleteContact = () => useDelete('contacts')

export const useCompanies = (params: Params) => useList<Company>('companies', params)
export const useCompany = (id?: number) => useOne<Company>('companies', id)
export const useSaveCompany = () => useSave<Company>('companies')
export const useDeleteCompany = () => useDelete('companies')

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

// --- activities ---
export const useActivities = (params: Params, enabled = true) =>
  useList<Activity>('activities', params, enabled)
export const useSaveActivity = () => useSave<Activity>('activities')
export const useDeleteActivity = () => useDelete('activities')

// --- users (admin) ---
export const useUsers = (params: Params, enabled = true) => useList<User>('users', params, enabled)
export const useSaveUser = () => useSave<User>('users')

// --- dashboard ---
export function useDashboard(ownerId?: number) {
  return useQuery({
    queryKey: ['dashboard', ownerId ?? null],
    queryFn: () => api<DashboardSummary>('/dashboard/summary', { query: { owner_id: ownerId } }),
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
