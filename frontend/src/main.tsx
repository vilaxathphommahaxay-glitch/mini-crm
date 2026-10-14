import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { AppProviders } from './AppProviders.tsx'
import { LocaleBoundary } from './i18n/LocaleBoundary'
import { createQueryClient } from './queryClient.ts'
import './index.css'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders client={queryClient}>
        <LocaleBoundary>
          <App />
        </LocaleBoundary>
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
