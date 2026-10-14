import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { t } from '../i18n'
import { LoadingState } from '../components/ui/states'
import { useAuth } from './context'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label={t('common.loadingSession')} fullScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}
