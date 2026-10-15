import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import type { Contact } from '../api/types'
import { mockApi, renderApp, staffUser } from '../test/utils'
import { ContactSelect } from './selects'

const contact = (id: number, first: string): Contact => ({
  id,
  first_name: first,
  last_name: null,
  full_name: first,
  email: null,
  phone: null,
  notes: null,
  company: null,
  tags: [],
  owner: { id: staffUser.id, name: staffUser.name },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

function Harness({ selected }: { selected?: { id: number; name: string } }) {
  const { register, control } = useForm({
    defaultValues: { contact_id: String(selected?.id ?? '') },
  })
  const value = useWatch({ control, name: 'contact_id' })
  return (
    <>
      <ContactSelect aria-label="Contact" {...register('contact_id')} selected={selected} />
      <output>{value}</output>
    </>
  )
}

describe('ContactSelect', () => {
  it('lists everything without a search box for a small shop', async () => {
    mockApi({
      'GET /api/contacts': () => ({
        body: { items: [contact(1, 'Noy')], total: 1, page: 1, size: 100 },
      }),
    })
    renderApp(<Harness />)
    await screen.findByRole('option', { name: 'Noy' })
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('finds contacts beyond the first 100 and keeps the choice while searching again', async () => {
    const first100 = Array.from({ length: 100 }, (_, i) => contact(i + 1, `Customer ${i + 1}`))
    const fetchMock = mockApi({
      'GET /api/contacts': ({ url }) => {
        const q = url.searchParams.get('search')
        const items = q === 'Somsak' ? [contact(150, 'Somsak')] : q ? [] : first100
        return { body: { items, total: q ? items.length : 150, page: 1, size: 100 } }
      },
    })
    renderApp(<Harness selected={{ id: 140, name: 'Keo (saved)' }} />)

    // the saved choice shows although it isn't in the first 100
    const select = await screen.findByRole('combobox', { name: 'Contact' })
    await waitFor(() => expect(select).toHaveDisplayValue('Keo (saved)'))

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Type to find a contact' }),
      'Somsak',
    )
    await screen.findByRole('option', { name: 'Somsak' })
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('search=Somsak'))).toBe(true)
    await userEvent.selectOptions(select, 'Somsak')
    expect(screen.getByRole('status')).toHaveTextContent('150')

    // a search that no longer matches keeps the picked contact selected
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    await screen.findByRole('option', { name: 'No matches' })
    expect(select).toHaveDisplayValue('Somsak')
  })
})
