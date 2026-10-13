import { createContext, useContext } from 'react'
import type { User } from '../api/types'

export interface AuthValue {
  user: User | null
  /** true until the stored token has been checked on startup */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/** For pages behind <RequireAuth>, where the user is always present. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser used outside an authenticated route')
  return user
}
