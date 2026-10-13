import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '../api/client'
import type { User } from '../api/types'
import { AuthContext, type AuthValue } from './context'

interface LoginResponse {
  access_token: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => tokenStore.get() !== null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    queryClient.clear() // never show the previous user's data to the next one
  }, [queryClient])

  // Restore the session from a stored token.
  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false
    api<User>('/auth/me')
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && tokenStore.clear())
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Expired or revoked token anywhere in the app -> back to the login page.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      queryClient.clear()
      tokenStore.set(result.access_token)
      setUser(result.user)
    },
    [queryClient],
  )

  const value = useMemo<AuthValue>(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
