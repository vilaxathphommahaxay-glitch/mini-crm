// Records owned by a disabled user must stay editable, and the form must show the real owner.
import { BASE, check, login, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')

async function setActive(name, active) {
  await page.goto(`${BASE}/users`)
  await main.locator('tr', { hasText: name }).getByRole('button', { name: 'Edit' }).click()
  const box = page.getByRole('dialog').getByLabel(/Active/)
  if (active) await box.check()
  else await box.uncheck()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await main.locator('tr', { hasText: name }).getByText(active ? 'Active' : 'Disabled').waitFor()
}

try {
  await login(page, 'admin@example.com', 'admin123')
  await setActive('Keo Phommachanh', false)
  check(true, 'Keo disabled')

  // a contact owned by Keo
  await page.goto(`${BASE}/contacts`)
  await page.getByLabel('Filter by owner').selectOption({ label: 'All owners' })
  await main.getByRole('table').waitFor()
  const keoRow = main.locator('tbody tr', { hasText: 'Keo Phommachanh' }).first()
  await keoRow.locator('a').click()
  await page.locator('main h1').waitFor()

  await main.getByRole('button', { name: 'Edit', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  const owner = dialog.getByLabel('Owner')
  await owner.locator('option', { hasText: '(disabled)' }).waitFor({ state: 'attached' })
  await page.waitForTimeout(200)
  const shown = await owner.evaluate((el) => el.options[el.selectedIndex]?.text)
  check(shown === 'Keo Phommachanh (disabled)', `owner select shows the real owner ("${shown}")`)

  await dialog.getByLabel('Notes').fill('Edited while the owner is disabled')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await main.getByText('Edited while the owner is disabled').waitFor()
  check(true, 'record of a disabled owner can be edited')

  await setActive('Keo Phommachanh', true)
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
