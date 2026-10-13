import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { adminUser, mockApi, renderApp, signIn, staffUser } from './test/utils'

describe('route guard', () => {
  it('sends visitors without a session to the login page', async () => {
    mockApi({})

    renderApp(<App />, '/contacts')

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('returns to the requested page after logging in', async () => {
    mockApi({
      'POST /api/auth/login': () => ({ body: { access_token: 't', user: staffUser } }),
    })
    renderApp(<App />, '/settings')

    await userEvent.type(await screen.findByLabelText('Email'), 'somchai@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'staff123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(localStorage.getItem('crm.token')).toBe('t')
  })

  it('shows the API error when login fails', async () => {
    mockApi({
      'POST /api/auth/login': () => ({
        status: 401,
        body: { error: { code: 'invalid_credentials', message: 'Incorrect email or password' } },
      }),
    })
    renderApp(<App />, '/login')

    await userEvent.type(await screen.findByLabelText('Email'), 'x@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
  })

  it('logs out when the stored token is no longer valid', async () => {
    localStorage.setItem('crm.token', 'expired')
    mockApi({
      'GET /api/auth/me': () => ({
        status: 401,
        body: { error: { code: 'unauthorized', message: 'Invalid or expired token' } },
      }),
    })

    renderApp(<App />, '/')

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(localStorage.getItem('crm.token')).toBeNull()
  })
})

describe('navigation by role', () => {
  it('hides the Users page from staff', async () => {
    mockApi(signIn(staffUser))

    renderApp(<App />, '/users')

    // redirected to the dashboard, and no Users link in the menu
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
    expect(nav).not.toHaveTextContent('Users')
  })

  it('shows the Users link to admins', async () => {
    mockApi(signIn(adminUser))

    renderApp(<App />, '/')

    const nav = (await screen.findAllByRole('navigation', { name: 'Main' }))[0]
    expect(nav).toHaveTextContent('Users')
  })

  it('shows a 404 page for unknown routes', async () => {
    mockApi(signIn(staffUser))

    renderApp(<App />, '/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
