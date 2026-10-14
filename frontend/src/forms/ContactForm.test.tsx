import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Contact } from '../api/types'
import { RequireAuth } from '../auth/guards'
import { mockApi, renderApp, signIn, staffUser } from '../test/utils'
import { ContactForm } from './ContactForm'
import {
  contactSchema,
  NEW_COMPANY,
  parseTags,
  toContactBody,
  type ContactFormValues,
} from './schemas'

const blank: ContactFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company_id: '',
  company_name: '',
  tags: '',
  notes: '',
  owner_id: '',
}

const emptyPage = { items: [], total: 0, page: 1, size: 100 }

describe('contact schema', () => {
  it('requires a first name', () => {
    const result = contactSchema.safeParse(blank)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(['first_name'])
  })

  it('accepts an empty email but rejects a malformed one', () => {
    expect(contactSchema.safeParse({ ...blank, first_name: 'Noy' }).success).toBe(true)
    expect(contactSchema.safeParse({ ...blank, first_name: 'Noy', email: 'nope' }).success).toBe(
      false,
    )
  })

  it('builds the API body: blanks become null, tags normalized, ids numeric', () => {
    const body = toContactBody({
      ...blank,
      first_name: '  Noy ',
      email: ' ',
      company_id: '7',
      tags: 'VIP, wholesale, vip,,',
    })
    expect(body).toEqual({
      first_name: 'Noy',
      last_name: null,
      email: null,
      phone: null,
      company_id: 7,
      tags: ['vip', 'wholesale'],
      notes: null,
    })
  })

  it('sends a new company by name instead of an id', () => {
    const values = {
      ...blank,
      first_name: 'A',
      company_id: NEW_COMPANY,
      company_name: ' Vang Vieng ',
    }

    expect(toContactBody(values)).toMatchObject({ company_name: 'Vang Vieng' })
    expect(toContactBody(values)).not.toHaveProperty('company_id')
    const missingName = contactSchema.safeParse({ ...values, company_name: '' })
    expect(missingName.error?.issues[0].path).toEqual(['company_name'])
  })

  it('parses tags like the backend', () => {
    expect(parseTags(' A ,b, a ')).toEqual(['a', 'b'])
  })
})

describe('<ContactForm>', () => {
  function setup(routes = {}) {
    const fetchMock = mockApi({
      ...signIn(staffUser),
      'GET /api/companies': () => ({ body: emptyPage }),
      ...routes,
    })
    const onClose = vi.fn()
    renderApp(
      <RequireAuth>
        <ContactForm onClose={onClose} />
      </RequireAuth>,
    )
    return { fetchMock, onClose }
  }

  it('shows validation errors without calling the API', async () => {
    const { fetchMock } = setup()

    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/contacts'))).toBe(
      false,
    )
  })

  it('posts the cleaned body and closes on success', async () => {
    let posted: unknown
    const { onClose } = setup({
      'POST /api/contacts': ({ body }: { body: unknown }) => {
        posted = body
        return { status: 201, body: { id: 1 } as Contact }
      },
    })

    await userEvent.type(await screen.findByLabelText(/First name/), 'Bounmy')
    await userEvent.type(screen.getByLabelText('Tags'), 'VIP, retail')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posted).toMatchObject({ first_name: 'Bounmy', tags: ['vip', 'retail'], email: null })
  })

  it('puts server field errors on the right field', async () => {
    setup({
      'POST /api/contacts': () => ({
        status: 422,
        body: {
          error: {
            code: 'validation_error',
            message: 'Invalid input',
            details: [{ field: 'company_id', message: 'Company not found' }],
          },
        },
      }),
    })

    await userEvent.type(await screen.findByLabelText(/First name/), 'Noy')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Company not found')).toBeInTheDocument()
  })
})
