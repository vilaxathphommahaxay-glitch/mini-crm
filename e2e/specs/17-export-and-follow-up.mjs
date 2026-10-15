// Deals export for Excel, and the dashboard's "not in touch for a while" list.
import { readFileSync } from 'node:fs'
import { BASE, check, login, saveFailure, SHOTS, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')

try {
  // admin exports every deal from the pipeline
  await login(page, 'admin@example.com', 'admin123')
  await page.goto(`${BASE}/pipeline`)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    main.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  check(/^deals-\d{4}-\d{2}-\d{2}\.csv$/.test(download.suggestedFilename()), 'deals file name')
  const path = `${SHOTS}${download.suggestedFilename()}`
  await download.saveAs(path)
  const text = readFileSync(path, 'utf8')
  const lines = text.trim().split(/\r\n/)
  check(text.charCodeAt(0) === 0xfeff, 'starts with a BOM for Excel')
  check(lines[0].includes('title,stage,value,currency'), 'header row')
  check(lines.length - 1 >= 30, `all deals exported (${lines.length - 1})`)
  await page.getByRole('button', { name: 'Log out' }).first().click()

  // a salesperson sees who they haven't talked to, and plans a call
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/`)
  const card = main.locator('div.rounded-lg', { hasText: /Not in touch for 30\+ days/ })
  await card.waitFor()
  const title = await card.locator('h2').innerText()
  const before = Number(/\((\d+)\)/.exec(title)[1])
  check(before > 0, `quiet customers listed (${before})`)
  const first = card.getByRole('listitem').first()
  const name = await first.getByRole('link').first().innerText()
  check(/Last contact|Never contacted/.test(await first.innerText()), 'shows when they last talked')
  await page.screenshot({ path: `${SHOTS}quiet-contacts.png`, fullPage: true })

  await first.getByRole('button', { name: 'Add task' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel(/Subject/).fill(`Call ${name} about new stock`)
  await form.getByRole('button', { name: 'Save' }).click()
  await form.waitFor({ state: 'hidden' })
  await card.locator('h2', { hasText: `(${before - 1})` }).waitFor()
  check(true, 'planning a task takes them off the list')
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
