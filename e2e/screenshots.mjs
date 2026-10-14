// Captures the README screenshots (docs/screenshots) from a freshly seeded app.
import { fileURLToPath } from 'node:url'
import { BASE, login, start } from './lib.mjs'

const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))
const { browser, page } = await start({ width: 1440, height: 900 })
const main = page.locator('main')
const save = (name) => page.screenshot({ path: `${OUT}${name}.png` })

try {
  await login(page, 'admin@example.com', 'admin123')
  await page.goto(`${BASE}/`)
  await main.locator('.recharts-bar-rectangle').first().waitFor()
  await page.waitForTimeout(800)
  await save('dashboard')

  await page.goto(`${BASE}/pipeline`)
  await page.getByRole('region', { name: 'Lead column' }).waitFor()
  await page.waitForTimeout(500)
  await save('pipeline')

  await page.goto(`${BASE}/contacts`)
  await main.getByRole('table').waitFor()
  await page.waitForTimeout(400)
  await save('contacts')

  await page.getByLabel('Search contacts').fill('Bounmy Keomany')
  await main.getByRole('link', { name: 'Bounmy Keomany' }).waitFor()
  await main.getByRole('link', { name: 'Bounmy Keomany' }).click()
  await main.getByText('Activity').first().waitFor()
  await page.waitForTimeout(800)
  await save('contact-detail')

  await page.goto(`${BASE}/tasks?due=overdue`)
  await main.locator('li').first().waitFor()
  await page.waitForTimeout(400)
  await save('tasks')
  console.log('saved screenshots')
} finally {
  await browser.close()
}
