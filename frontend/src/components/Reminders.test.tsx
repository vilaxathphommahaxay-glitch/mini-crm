import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { mockApi, renderApp, signIn, staffUser } from '../test/utils'

const page = { items: [], total: 0, page: 1, size: 20 }

function stack(reminders: { overdue: number; today: number }) {
  mockApi({
    ...signIn(staffUser),
    'GET /api/activities/reminders': () => ({ body: reminders }),
    'GET /api/contacts': () => ({ body: page }),
    'GET /api/tags': () => ({ body: [] }),
  })
  renderApp(<App />, '/contacts')
}

describe('task reminders', () => {
  it('shows how many tasks need attention on the Tasks menu and in the tab title', async () => {
    stack({ overdue: 2, today: 1 })

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    const tasks = await waitFor(() => {
      const link = [...nav.querySelectorAll('a')].find((a) => a.textContent?.includes('Tasks'))
      expect(link?.textContent).toContain('3')
      return link!
    })
    expect(tasks).toHaveTextContent('3 tasks overdue or due today')
    expect(document.title).toBe('(3) Mini CRM')
    // phone top bar gets a shortcut to the overdue list
    expect(screen.getByRole('link', { name: '3 tasks overdue or due today' })).toHaveAttribute(
      'href',
      '/tasks?due=overdue',
    )
  })

  it('stays quiet when nothing is due', async () => {
    stack({ overdue: 0, today: 0 })

    await screen.findByRole('navigation', { name: 'Main' })
    await screen.findByLabelText('Search contacts')
    expect(screen.queryByText(/overdue or due today/)).not.toBeInTheDocument()
    expect(document.title).toBe('Mini CRM')
  })
})
