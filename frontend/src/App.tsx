import { Route, Routes } from 'react-router'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { PageHeader } from './components/ui/layout'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'

// Filled in by later phases.
function Placeholder({ title }: { title: string }) {
  return <PageHeader title={title} subtitle="Coming soon" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Placeholder title="Dashboard" />} />
        <Route path="contacts" element={<Placeholder title="Contacts" />} />
        <Route path="companies" element={<Placeholder title="Companies" />} />
        <Route path="pipeline" element={<Placeholder title="Pipeline" />} />
        <Route path="tasks" element={<Placeholder title="Tasks" />} />
        <Route
          path="users"
          element={
            <RequireAdmin>
              <Placeholder title="Users" />
            </RequireAdmin>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
