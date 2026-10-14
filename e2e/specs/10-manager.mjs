// A manager's tasks: compare the team, then hand a leaving salesperson's records to someone else.
import { BASE, check, login, logout, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start({ width: 1440, height: 1000 })
const main = page.locator('main')
const teamRow = (name) => main.locator('tr', { has: page.getByRole('button', { name }) })

try {
  await login(page, 'somchai@example.com', 'staff123')
  const somchaiBefore = (await (await page.request.get(`${BASE}/api/contacts`, {
    headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('crm.token'))}` },
  })).json()).total
  check(!(await main.getByRole('heading', { name: 'Team' }).isVisible()), 'staff do not see the team table')
  await logout(page)

  await login(page, 'admin@example.com', 'admin123')
  await main.getByRole('heading', { name: 'Team' }).waitFor()
  const keoOpen = Number(await teamRow('Keo Phommachanh').locator('td').nth(1).textContent())
  check(keoOpen > 0, `team table shows Keo's open deals (${keoOpen})`)
  await shot(page, 'p14-team')

  // drill into one person
  await teamRow('Keo Phommachanh').getByRole('button').click()
  await page.waitForURL(/owner_id=/)
  await main.locator('a', { hasText: 'Open deals' }).waitFor()
  const filtered = await main.locator('a', { hasText: 'Open deals' }).locator('p').nth(1).textContent()
  check(Number(filtered) === keoOpen, `clicking a name filters the dashboard (${filtered})`)
  check(!(await main.getByRole('heading', { name: 'Team' }).isVisible()), 'team table hides while filtered')

  // Keo leaves: transfer everything to Somchai, then disable Keo
  await page.goto(`${BASE}/users`)
  await main.locator('tr', { hasText: 'Keo Phommachanh' }).getByRole('button', { name: 'Transfer records' }).click()
  const dialog = page.getByRole('dialog')
  check(!(await dialog.getByRole('option', { name: 'Keo Phommachanh' }).count()), "can't transfer to the same person")
  check(await dialog.getByRole('button', { name: 'Transfer records' }).isDisabled(), 'needs a recipient')
  await dialog.getByLabel(/Give everything to/).selectOption({ label: 'Somchai Vongsa' })
  await dialog.getByRole('button', { name: 'Transfer records' }).click()
  const toast = page.getByText(/^Moved to Somchai Vongsa/)
  await toast.waitFor()
  const moved = Number((await toast.textContent()).match(/(\d+) contacts/)[1])
  check(moved > 0, `toast reports what moved (${await toast.textContent()})`)

  await main.locator('tr', { hasText: 'Keo Phommachanh' }).getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog').getByLabel(/Active/).uncheck()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await main.locator('tr', { hasText: 'Keo Phommachanh' }).getByText('Disabled').waitFor()

  await page.goto(`${BASE}/`)
  await main.getByRole('heading', { name: 'Team' }).waitFor()
  check((await teamRow('Keo Phommachanh').count()) === 0, 'disabled person with nothing left drops off the team table')
  await logout(page)

  // Somchai now has Keo's customers
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/contacts`)
  await main.getByText(/contact\(s\)/).waitFor()
  const after = Number((await main.getByText(/contact\(s\)/).textContent()).match(/\d+/)[0])
  check(after === somchaiBefore + moved, `Somchai sees ${somchaiBefore} + ${moved} = ${after} contacts`)

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
