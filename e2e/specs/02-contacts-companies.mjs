import { BASE, check, login, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')
try {
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('table').waitFor()
  const subtitle = await main.getByText(/contact\(s\)/).textContent()
  check(subtitle.startsWith('12 '), `staff sees own 12 contacts (${subtitle})`)
  await shot(page, 'p7-contacts')

  // search is debounced into the URL
  const firstName = (await main.locator('tbody tr td').first().textContent()).split(' ')[0]
  await page.getByLabel('Search contacts').fill(firstName)
  await page.waitForURL(/search=/)
  await page.waitForTimeout(400)
  const rows = await main.locator('tbody tr').count()
  check(rows >= 1 && rows < 12, `search "${firstName}" narrows the list (${rows} rows)`)
  await page.getByLabel('Search contacts').fill('zzzz-nobody')
  await main.getByText('No contacts match these filters').waitFor()
  check(true, 'empty state for no matches')
  await page.getByLabel('Search contacts').fill('')
  await page.waitForTimeout(500)

  // tag filter
  // first tag that this user's contacts actually use
  const tag = await page.getByLabel('Filter by tag').locator('option').nth(1).getAttribute('value')
  await page.getByLabel('Filter by tag').selectOption(tag)
  await page.waitForURL(new RegExp(`tag=${tag}`))
  await page.waitForTimeout(300)
  const tagCells = await main.locator('tbody tr td:nth-child(5)').allTextContents()
  check(tagCells.length > 0 && tagCells.every((t) => t.includes(tag)), `tag filter shows only "${tag}"`)
  await page.getByLabel('Filter by tag').selectOption('')

  // create a contact
  await page.getByRole('button', { name: 'New contact' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save' }).click()
  check(await dialog.getByText('First name is required').isVisible(), 'required field message')
  await dialog.getByLabel(/First name/).fill('Test')
  await dialog.getByLabel('Last name').fill('Person')
  await dialog.getByLabel('Email').fill('test.person@example.la')
  await dialog.getByLabel('Company').selectOption({ label: 'Vientiane Coffee House' })
  await dialog.getByLabel('Tags').fill('VIP, New')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Test Person' }).waitFor()
  check(/\/contacts\/\d+$/.test(page.url()), 'after create, opens the new contact')
  check(await main.getByText('Vientiane Coffee House').first().isVisible(), 'company shown on detail')

  // edit: the company select must show the saved company
  await main.getByRole('button', { name: 'Edit' }).click()
  const companySelect = page.getByRole('dialog').getByLabel('Company')
  await companySelect.locator('option', { hasText: 'Vientiane Coffee House' }).waitFor({ state: 'attached' })
  await page.waitForTimeout(200)
  const shown = await companySelect.evaluate((el) => el.options[el.selectedIndex]?.text)
  check(shown === 'Vientiane Coffee House', `edit form preselects company (shows "${shown}")`)
  await page.getByRole('dialog').getByLabel('Phone').fill('+856 20 1234 5678')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await main.getByText('+856 20 1234 5678').waitFor()
  check(true, 'edit saved')

  // log an activity on the timeline
  await main.getByRole('button', { name: 'Log activity' }).click()
  const actDialog = page.getByRole('dialog')
  await actDialog.getByLabel('Type').selectOption('task')
  await actDialog.getByLabel(/Subject/).fill('Call about pricing')
  await actDialog.getByLabel('Due date').fill('2030-01-15')
  await actDialog.getByRole('button', { name: 'Save' }).click()
  await main.getByText('Call about pricing').waitFor()
  check(await main.getByText('Due 15/01/2030').isVisible(), 'activity shows due date DD/MM/YYYY')
  const box = main.getByRole('checkbox', { name: 'Done: Call about pricing' })
  await box.check()
  check(await box.isChecked(), 'tick marks done immediately')
  await page.getByText('Marked as done').waitFor()
  await page.waitForTimeout(300)
  check(await box.isChecked(), 'still done after the server confirms')

  // add a deal from the contact page, then deleting the contact must be refused
  await main.getByRole('button', { name: 'New deal' }).click()
  const dealDialog = page.getByRole('dialog')
  await dealDialog.getByLabel(/Title/).fill('Test deal')
  await dealDialog.getByLabel(/Value/).fill('2,500,000')
  await dealDialog.getByRole('button', { name: 'Save' }).click()
  await main.getByText('2,500,000 LAK').waitFor()
  check(true, 'deal created from contact page with formatted value')
  await shot(page, 'p7-contact-detail')

  await main.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('alert').filter({ hasText: 'deal' }).waitFor()
  check(page.url().match(/\/contacts\/\d+$/) !== null, 'delete refused while a deal exists (toast)')

  // remove the deal (from its own page), then the contact can be deleted
  const contactUrl = page.url()
  await main.getByRole('cell', { name: 'Test deal' }).click()
  await page.getByRole('heading', { name: 'Test deal' }).waitFor()
  check(/\/deals\/\d+$/.test(page.url()), 'clicking a deal opens its page')
  await main.getByRole('button', { name: 'Edit', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete deal' }).click()
  await page.getByRole('dialog', { name: 'Delete deal?' }).getByRole('button', { name: 'Delete' }).click()
  await page.waitForURL(/\/pipeline$/)
  check(true, 'deleting a deal from its page returns to the pipeline')
  await page.goto(contactUrl)
  await main.getByText('No deals yet').waitFor()
  await main.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.waitForURL(/\/contacts$/)
  check(true, 'contact deleted after its deal is gone')

  // companies
  await page.goto(`${BASE}/companies`)
  await main.getByRole('table').waitFor()
  await main.getByRole('link', { name: 'Vientiane Coffee House' }).click()
  await page.getByRole('heading', { name: 'Vientiane Coffee House' }).waitFor()
  await main.locator('ul li a').first().waitFor()
  const contactLinks = await main.locator('ul li a').count()
  check(contactLinks > 0, `company page lists its contacts (${contactLinks})`)
  await shot(page, 'p7-company')
  await main.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('alert').filter({ hasText: 'contact(s)' }).waitFor()
  check(true, 'company delete refused while it has contacts')

  // contact #2 belongs to Keo -> Somchai gets the not-found page
  await page.goto(`${BASE}/contacts/2`)
  await page.getByRole('heading', { name: 'Page not found' }).waitFor()
  check(true, "another staff member's contact shows Page not found")

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
