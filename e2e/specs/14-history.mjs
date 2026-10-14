// Edit history: a record's own history, and the admin-wide "Change history" page.
import { BASE, SHOTS, check, login, logout, saveFailure, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')

try {
  // staff changes a contact
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'New contact' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel(/First name/).fill('Historia')
  await form.getByLabel('Phone').fill('020 1111 1111')
  await form.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Historia' }).waitFor()
  await main.getByRole('button', { name: 'Edit' }).click()
  await form.getByLabel('Phone').fill('020 2222 2222')
  await form.getByRole('button', { name: 'Save' }).click()
  await form.waitFor({ state: 'hidden' })

  // ...and reads its history on the contact page
  await main.getByRole('button', { name: 'Show history' }).click()
  const entries = main.getByRole('listitem').filter({ hasText: /contact “Historia”/ })
  await entries.first().waitFor()
  const texts = await entries.allInnerTexts()
  check(texts.length === 2, `two entries: added and changed (${texts.length})`)
  check(/Somchai Vongsa changed contact “Historia”/.test(texts[0]), 'newest first, with who did it')
  check(texts[0].includes('Phone: 020 1111 1111 → 020 2222 2222'), 'shows the old and new phone')
  check(/Somchai Vongsa added contact “Historia”/.test(texts[1]), 'creation is recorded')
  const contactUrl = page.url()

  // staff deletes a task; staff can't open the admin history page
  await page.goto(`${BASE}/tasks?due=overdue`)
  const task = main.getByRole('listitem').first()
  const done = await task.getByRole('checkbox').getAttribute('aria-label')
  const subject = done.replace(/^Done: /, '')
  await task.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByText('Activity deleted').waitFor()
  await page.goto(`${BASE}/history`)
  check(
    (await page.getByRole('navigation', { name: 'Main' }).getByText('Change history').count()) ===
      0,
    'staff have no Change history menu',
  )
  await logout(page)

  // the admin sees every change, newest first, and who made it
  await login(page, 'admin@example.com', 'admin123')
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Change history' })
    .click()
  await page.getByRole('heading', { name: 'Change history' }).waitFor()
  const first = main.getByRole('listitem').first()
  await first.waitFor()
  check(
    (await first.innerText()).includes(`Somchai Vongsa deleted activity “${subject}”`),
    `deleted task is listed (${subject})`,
  )
  await page.screenshot({ path: `${SHOTS}history.png`, fullPage: true })

  // filter by kind; entries link to records that still exist
  await main.getByLabel('Show changes to').selectOption('contact')
  await main.getByRole('link', { name: /changed contact “Historia”/ }).click()
  await page.getByRole('heading', { name: 'Historia' }).waitFor()
  check(page.url() === contactUrl, 'entry links to the contact')
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
