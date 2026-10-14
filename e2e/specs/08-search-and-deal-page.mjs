// Ctrl+K quick search and the deal page (timeline, stage change, links).
import { BASE, check, login, saveFailure, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')
const palette = page.getByRole('dialog', { name: 'Search' })
const box = page.getByRole('combobox', { name: /Search contacts/ })

try {
  await login(page, 'admin@example.com', 'admin123')
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('table').waitFor()

  // open with the keyboard shortcut, type, results grouped
  await page.keyboard.press('Control+k')
  await box.waitFor()
  check(await box.evaluate((el) => el === document.activeElement), 'Ctrl+K opens search with focus in the box')
  await box.fill('mekong')
  await palette.getByRole('option').first().waitFor()
  const text = await palette.textContent()
  check(text.includes('Contacts') && text.includes('Companies'), 'results are grouped')
  check(text.includes('Mekong Trading'), 'company found')
  await shot(page, 'p12-search')

  // arrow down + enter opens the highlighted result
  const options = palette.getByRole('option')
  await box.press('ArrowDown')
  const second = await options.nth(1).locator('p').first().textContent()
  check((await options.nth(1).getAttribute('aria-selected')) === 'true', 'ArrowDown moves the highlight')
  await box.press('Enter')
  await page.getByRole('heading', { name: second }).waitFor()
  check(true, `Enter opened "${second}"`)

  // Esc closes; no results message
  await page.keyboard.press('Control+k')
  await box.fill('zzzz-nothing')
  await palette.getByText('No results').waitFor()
  check(true, 'no-results message')
  await box.press('Escape')
  check((await palette.count()) === 0, 'Esc closes the search')

  // find a deal by its contact's name and open the deal page
  await page.getByRole('button', { name: /^Search…/ }).first().click()
  await box.fill('Repeat order')
  await palette.getByRole('option').first().waitFor()
  const dealTitle = await palette.getByRole('option').first().locator('p').first().textContent()
  await palette.getByRole('option').first().click()
  await page.getByRole('heading', { name: dealTitle }).waitFor()
  check(/\/deals\/\d+$/.test(page.url()), `search opens deal page (${dealTitle})`)

  // stage change from the deal page
  await main.getByLabel('Stage').selectOption('lost')
  await page.getByText('Moved to Lost').waitFor()
  await page.waitForTimeout(500)
  check((await main.getByText('Closed').count()) > 0, 'moving to Lost shows the closed date')

  // log an activity on the deal; it appears on the contact timeline too
  await main.getByRole('button', { name: 'Log activity' }).click()
  const dialog = page.getByRole('dialog')
  check((await dialog.getByLabel('Deal').count()) === 0, 'deal is fixed when logging from its page')
  await dialog.getByLabel(/Subject/).fill('Customer chose a competitor')
  await dialog.getByLabel('Type').selectOption('note')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await main.getByText('Customer chose a competitor').waitFor()
  await shot(page, 'p12-deal')
  await main.locator('h1 + div a').nth(1).click() // contact link in the subtitle
  await main.getByText('Customer chose a competitor').waitFor()
  check(true, 'deal activity shows on the contact timeline')

  // staff cannot open someone else's deal
  await page.getByRole('button', { name: 'Log out' }).first().click()
  await login(page, 'keo@example.com', 'staff123')
  await page.goto(`${BASE}/deals/1`) // seed deal #1 belongs to Somchai's contact
  await page.getByRole('heading', { name: 'Page not found' }).waitFor()
  check(true, "another staff member's deal shows Page not found")

  // mobile header has a search button
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await box.waitFor()
  check(true, 'search button on phones')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
