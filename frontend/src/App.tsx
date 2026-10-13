import { useQuery } from '@tanstack/react-query'
import { Route, Routes } from 'react-router'

type Health = { status: string }

async function fetchHealth(): Promise<Health> {
  const response = await fetch('/api/health')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function HomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Mini CRM</h1>
      <p className="mt-4 text-slate-700">
        Backend: {health.isPending && <span className="text-slate-500">checking…</span>}
        {health.isError && <span className="text-red-600">unreachable</span>}
        {health.isSuccess && (
          <span data-testid="health-status" className="text-green-700">
            {health.data.status}
          </span>
        )}
      </p>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
