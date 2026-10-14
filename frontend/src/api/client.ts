import { t } from '../i18n'
import { apiErrorText, fieldErrorText, type ApiDetail } from './errorText'

const TOKEN_KEY = 'crm.token'

// localStorage can throw (private mode, blocked storage) — treat that as "no token".
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* session will just not survive a reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* nothing to clear */
    }
  },
}

/** The backend's error shape: {"error": {"code", "message", "details"}}. */
export class ApiError extends Error {
  status: number
  code: string
  details: ApiDetail[]

  constructor(status: number, code: string, message: string, details: ApiDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let unauthorizedHandler: (() => void) | null = null

/** Called when a request with a token gets 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

type QueryValue = string | number | boolean | null | undefined

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  /** Return the Response itself (for file downloads). */
  raw?: boolean
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `/api${path}${qs ? `?${qs}` : ''}`
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, raw } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection.')
  }

  if (!response.ok) {
    const error = await toApiError(response)
    if (response.status === 401 && token) {
      tokenStore.clear()
      unauthorizedHandler?.()
    }
    throw error
  }
  if (raw) return response as T
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const { error } = await response.json()
    return new ApiError(response.status, error.code, error.message, error.details ?? [])
  } catch {
    return new ApiError(response.status, 'error', `Request failed (${response.status})`)
  }
}

/** Field-level problems as {field: text in the user's language} for forms. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  return Object.fromEntries(
    error.details.filter((d) => d.field).map((d) => [d.field, fieldErrorText(d)]),
  )
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? apiErrorText(error) : t('error.generic')
}
