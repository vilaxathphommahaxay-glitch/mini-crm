// A salesperson's day: new customer from an unknown company, log the call with a follow-up,
// open a deal, and see deals that have no next step on the dashboard.
import { BASE, check, login, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')

try {
  await login(page, 'somchai@example.com', 'staff123')
  const before = Number(
    (await main.getByRole('heading', { name: /Deals without a next step/ }).textContent()).match(/\d+/)[0],
  )
  check(before > 0, `dashboard lists deals without a next step (${before})`)

  // new customer from a company that isn't in the CRM yet - one form
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'New contact' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel(/First name/).fill('Phonesavanh')
  await form.getByLabel('Last name').fill('Inthalath')
  await form.getByLabel('Phone').fill('+856 20 5544 3322')
  await form.getByLabel('Company', { exact: true }).selectOption({ label: '+ New company…' })
  await form.getByRole('button', { name: 'Save' }).click()
  check(await form.getByText('Type the new company name').isVisible(), 'new company needs a name')
  await form.getByLabel(/New company name/).fill('Vang Vieng Resort')
  await form.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Phonesavanh Inthalath' }).waitFor()
  check(await main.getByRole('link', { name: 'Vang Vieng Resort' }).isVisible(), 'contact saved with the new company')

  // a second contact typed with different letter case joins the same company
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'New contact' }).click()
  await form.getByLabel(/First name/).fill('Ketsana')
  await form.getByLabel('Company', { exact: true }).selectOption({ label: '+ New company…' })
  await form.getByLabel(/New company name/).fill('vang vieng RESORT')
  await form.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Ketsana' }).waitFor()
  await main.getByRole('link', { name: 'Vang Vieng Resort' }).click()
  await page.getByRole('heading', { name: 'Vang Vieng Resort' }).waitFor()
  await main.locator('ul li a', { hasText: 'Ketsana' }).waitFor()
  check((await main.locator('ul li a').count()) === 2, 'same-name company reused, not duplicated')

  // open a deal, then log the call and schedule the follow-up in one go
  await main.locator('ul li a', { hasText: 'Phonesavanh' }).click()
  await page.getByRole('heading', { name: 'Phonesavanh Inthalath' }).waitFor()
  await main.getByRole('button', { name: 'New deal' }).click()
  await page.getByRole('dialog').getByLabel(/Title/).fill('Room booking - 20 rooms')
  await page.getByRole('dialog').getByLabel(/Value/).fill('15,000,000')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await main.getByText('15,000,000 LAK').waitFor()

  await page.goto(`${BASE}/`)
  await main.getByText('Room booking - 20 rooms').waitFor()
  check(true, 'new deal shows up as "no next step"')

  await page.goto(`${BASE}/contacts`)
  await page.getByLabel('Search contacts').fill('Phonesavanh')
  await main.getByRole('link', { name: 'Phonesavanh Inthalath' }).click()
  await main.getByRole('button', { name: 'Log activity' }).click()
  const act = page.getByRole('dialog')
  check((await act.getByLabel('Type').inputValue()) === 'call', '"Log activity" starts as a call')
  await act.getByLabel(/Subject/).fill('First call - wants a quote')
  await act.getByLabel('Deal').selectOption({ label: 'Room booking - 20 rooms · Lead' })
  await act.getByLabel('Schedule a follow-up task').check()
  await act.getByLabel(/Next step/).fill('Send the quotation')
  await shot(page, 'p13-log-with-follow-up')
  await act.getByRole('button', { name: 'Save' }).click()
  await page.getByText('follow-up scheduled').waitFor()
  await main.getByText('Send the quotation').waitFor()
  const followUpRow = await main.locator('li', { hasText: 'Send the quotation' }).textContent()
  check(/Due \d\d\/\d\d\/\d{4}/.test(followUpRow), 'follow-up task created with a due date')
  check(await main.getByRole('checkbox', { name: 'Done: Send the quotation' }).isVisible(), 'follow-up can be ticked off')

  // the deal now has a next step, so it leaves the dashboard list
  await page.goto(`${BASE}/`)
  await main.getByRole('heading', { name: /Deals without a next step/ }).waitFor()
  await page.waitForTimeout(500)
  check(!(await main.getByText('Room booking - 20 rooms').isVisible()), 'deal with a planned step leaves the list')

  // plan a step straight from the dashboard
  const first = main.locator('li', { has: page.getByRole('button', { name: 'Add task' }) }).first()
  const title = await first.locator('a').textContent()
  await first.getByRole('button', { name: 'Add task' }).click()
  const task = page.getByRole('dialog')
  check((await task.getByLabel('Type').inputValue()) === 'task', 'dashboard "Add task" opens a task')
  await task.getByLabel(/Subject/).fill('Call to check budget')
  await task.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Activity saved').waitFor()
  await page.waitForTimeout(800)
  check(!(await main.getByRole('link', { name: title, exact: true }).isVisible()), `"${title}" planned from the dashboard`)
  await shot(page, 'p13-dashboard')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
