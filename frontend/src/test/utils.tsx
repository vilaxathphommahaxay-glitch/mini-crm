import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AppProviders } from '../AppProviders'
import { createQueryClient } from '../queryClient'
import type { User } from '../api/types'

type Handler = (request: { url: URL; body: unknown }) => { status?: number; body?: unknown }

/**
 * Replace fetch with a tiny router: keys look like "GET /api/auth/me".
 * Unknown routes fail the request loudly with a 500.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const handler = routes[key]
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body
    const result = handler
      ? handler({ url, body })
      : { status: 500, body: { error: { code: 'unmocked', message: `Unmocked ${key}` } } }
    const status = result.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(result.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const staffUser: User = {
  id: 2,
  name: 'Somchai Vongsa',
  email: 'somchai@example.com',
  role: 'staff',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export const adminUser: User = { ...staffUser, id: 1, name: 'Admin', role: 'admin' }

export function signIn(user: User) {
  localStorage.setItem('crm.token', 'test-token')
  return {
    'GET /api/auth/me': () => ({ body: user }),
    'GET /api/activities/reminders': () => ({ body: { overdue: 0, today: 0 } }),
  }
}

export function renderApp(ui: ReactNode, path = '/') {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders client={client}>{ui}</AppProviders>
    </MemoryRouter>,
  )
}
