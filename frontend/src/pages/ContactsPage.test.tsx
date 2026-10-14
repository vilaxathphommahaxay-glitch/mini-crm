import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'
import type { Contact } from '../api/types'
import { mockApi, renderApp, signIn, staffUser } from '../test/utils'

const noy: Contact = {
  id: 7,
  first_name: 'Noy',
  last_name: 'Keomany',
  full_name: 'Noy Keomany',
  email: null,
  phone: null,
  notes: null,
  company: null,
  tags: [],
  owner: { id: staffUser.id, name: staffUser.name },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}
const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, size: 20 })

describe('contacts search', () => {
  it('does not pull the user back to the list after they open a contact', async () => {
    mockApi({
      ...signIn(staffUser),
      'GET /api/contacts': () => ({ body: page([noy]) }),
      'GET /api/tags': () => ({ body: [] }),
      'GET /api/contacts/7': () => ({ body: noy }),
      'GET /api/deals': () => ({ body: page([]) }),
      'GET /api/activities': () => ({ body: page([]) }),
    })
    renderApp(<App />, '/contacts')

    // type, and open the contact before the 300 ms search delay has passed
    await userEvent.type(await screen.findByLabelText('Search contacts'), 'No')
    await userEvent.click(screen.getByRole('link', { name: 'Noy Keomany' }))
    expect(await screen.findByRole('heading', { name: 'Noy Keomany' })).toBeInTheDocument()

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(screen.getByRole('heading', { name: 'Noy Keomany' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Search contacts')).not.toBeInTheDocument()
  })
})
