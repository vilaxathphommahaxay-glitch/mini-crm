import { BASE, check, login, logout, saveFailure, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start()
try {
  await page.goto(`${BASE}/contacts`)
  await page.getByRole('heading', { name: /sign in/i }).waitFor()
  check(page.url().endsWith('/login'), 'anonymous visit redirects to /login')
  await shot(page, 'p6-login')

  await page.getByLabel('Email').fill('admin@example.com')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('alert').waitFor()
  check((await page.getByRole('alert').textContent()).includes('Incorrect'), 'wrong password shows error')

  await page.getByLabel('Password').fill('admin123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('heading', { name: 'Contacts' }).waitFor()
  check(page.url().endsWith('/contacts'), 'after login returns to the page asked for')
  check(await page.getByRole('link', { name: 'Users' }).isVisible(), 'admin sees Users link')

  await page.reload()
  await page.getByRole('heading', { name: 'Contacts' }).waitFor()
  check(true, 'session survives a reload')

  await page.goto(`${BASE}/settings`)
  await page.getByLabel('Current password').fill('admin123')
  await page.getByLabel('New password', { exact: true }).fill('short')
  await page.getByLabel('Confirm new password').fill('short')
  const changeBtn = page.getByRole('button', { name: 'Change password' })
  check(await changeBtn.isEnabled(), 'change-password button enabled when fields are filled')
  await changeBtn.click()
  check(await page.getByText('At least 8 characters').first().isVisible(), 'client-side password check')
  await shot(page, 'p6-settings')

  await logout(page)
  await login(page, 'somchai@example.com', 'staff123')
  check(!(await page.getByRole('link', { name: 'Users' }).isVisible()), 'staff has no Users link')
  await page.goto(`${BASE}/users`)
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor()
  check(!page.url().endsWith('/users'), 'staff is redirected away from /users')
  await page.goto(`${BASE}/nope`)
  await page.getByRole('heading', { name: 'Page not found' }).waitFor()
  check(true, '404 page')

  // tablet width: sidebar becomes a drawer
  await page.setViewportSize({ width: 820, height: 1000 })
  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('link', { name: 'Tasks' }).last().click()
  await page.getByRole('heading', { name: 'Tasks' }).waitFor()
  check(!(await page.getByRole('link', { name: 'Pipeline' }).last().isVisible()), 'drawer closes after navigating')
  await shot(page, 'p6-tablet')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
