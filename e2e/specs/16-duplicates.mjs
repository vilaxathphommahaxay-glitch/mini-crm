// Duplicate contacts: found by the same phone written differently, merged into the one to keep.
import { BASE, check, login, saveFailure, SHOTS, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')
const api = (path, body) =>
  page.evaluate(
    async ([path, body]) => {
      const response = await fetch(`/api${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('crm.token')}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      return response.json()
    },
    [path, body],
  )

// unique per run, so the spec also works on a stack it has run against before
const run = String(Date.now()).slice(-6)
const first = `Dupa${run}`
const full = `${first} Test`

try {
  await login(page, 'somchai@example.com', 'staff123')
  // the same customer entered twice, with the phone written two ways
  const keep = await api('/contacts', {
    first_name: first,
    last_name: 'Test',
    phone: `+856 20 77 ${run}`,
  })
  const other = await api('/contacts', {
    first_name: first,
    phone: `020 77${run}`,
    email: `dupa${run}@example.la`,
    notes: 'Prefers WhatsApp',
    tags: ['wholesale'],
  })
  await api('/deals', { title: `${first} coffee order`, value: '500000', contact_id: other.id })

  await page.goto(`${BASE}/contacts`)
  await main.getByRole('link', { name: 'Find duplicates' }).click()
  await page.getByRole('heading', { name: 'Possible duplicates' }).waitFor()
  const group = main.locator('div.rounded-lg', { hasText: full })
  await group.waitFor()
  const text = await group.innerText()
  check(text.includes('Same phone'), 'found by the same phone in two formats')
  check(/1 deals · 0 activities · 0 files/.test(text), 'shows what hangs on each contact')
  await page.screenshot({ path: `${SHOTS}duplicates.png`, fullPage: true })

  // keep the first one; the other is merged into it
  await group.getByRole('button', { name: `Keep this one: ${full}` }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText(/merge 1 other contact into it/).waitFor()
  check(true, 'confirmation explains the merge')
  await dialog.getByRole('button', { name: 'Merge' }).click()
  await page.getByText(`Merged into ${full}`).waitFor()
  await main.locator('div.rounded-lg', { hasText: full }).waitFor({ state: 'detached' })
  check(true, 'the group is gone after merging')

  // the kept contact has everything
  await page.goto(`${BASE}/contacts/${keep.id}`)
  await page.getByRole('heading', { name: full }).waitFor()
  await main.getByText(`${first} coffee order`).waitFor()
  const details = await main.innerText()
  check(details.includes(`dupa${run}@example.la`), 'email filled in from the duplicate')
  check(details.includes('Prefers WhatsApp'), 'notes kept')
  check(details.includes('wholesale'), 'tags kept')
  check(details.includes(`${first} coffee order`), 'deal moved over')
  await main.getByRole('button', { name: 'Show history' }).click()
  await main.getByText(`Somchai Vongsa merged “${first}” into contact “${full}”`).waitFor()
  check(
    await main.getByText('Moved 1 deals, 0 activities and 0 files').isVisible(),
    'history records the merge',
  )
  await page.goto(`${BASE}/contacts/${other.id}`)
  await page
    .getByText(/not found/i)
    .first()
    .waitFor()
  check(true, 'the duplicate is gone')

  // phone layout
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/contacts/duplicates`)
  await page.getByRole('heading', { name: 'Possible duplicates' }).waitFor()
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  check(fits, 'duplicates page fits a phone')
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
