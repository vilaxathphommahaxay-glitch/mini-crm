import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { LoadingState } from './components/ui/states'
import { LoginPage } from './pages/LoginPage'

// Each page is its own chunk, so the first load stays small (charts load with the dashboard).
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage')
const ContactsPage = page(() => import('./pages/ContactsPage'), 'ContactsPage')
const ContactDetailPage = page(() => import('./pages/ContactDetailPage'), 'ContactDetailPage')
const CompaniesPage = page(() => import('./pages/CompaniesPage'), 'CompaniesPage')
const CompanyDetailPage = page(() => import('./pages/CompanyDetailPage'), 'CompanyDetailPage')
const PipelinePage = page(() => import('./pages/PipelinePage'), 'PipelinePage')
const TasksPage = page(() => import('./pages/TasksPage'), 'TasksPage')
const UsersPage = page(() => import('./pages/UsersPage'), 'UsersPage')
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage')
const NotFoundPage = page(() => import('./pages/NotFoundPage'), 'NotFoundPage')

export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route
            path="users"
            element={
              <RequireAdmin>
                <UsersPage />
              </RequireAdmin>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
