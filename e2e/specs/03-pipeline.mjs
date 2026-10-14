import { BASE, check, login, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start({ width: 1920, height: 1000 })
const column = (name) => page.getByRole('region', { name: `${name} column` })
const titles = async (name) =>
  column(name).locator('li [aria-roledescription] p.font-medium').allTextContents()

async function drag(from, to, { below = false } = {}) {
  await to.scrollIntoViewIfNeeded()
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 5 })
  const y = below ? b.y + b.height - 5 : b.y + 10
  await page.mouse.move(b.x + b.width / 2, y, { steps: 20 })
  await page.waitForTimeout(150)
  await page.mouse.up()
}

try {
  await login(page, 'admin@example.com', 'admin123')
  await page.goto(`${BASE}/pipeline`)
  await column('Lead').waitFor()
  await page.waitForTimeout(500)
  await shot(page, 'p8-board')

  const lead = await titles('Lead')
  const qualified = await titles('Qualified')
  check(lead.length >= 2 && qualified.length >= 1, `board loaded (lead ${lead.length}, qualified ${qualified.length})`)
  const leadTotalsBefore = await column('Lead').locator('header p').textContent()

  // 1) drag the first Lead card onto the first Qualified card -> lands before it
  const moving = lead[0]
  await drag(column('Lead').locator('li').first(), column('Qualified').locator('li').first())
  await page.getByText('Moved to Qualified').waitFor()
  const q1 = await titles('Qualified')
  check(q1[0] === moving, `"${moving}" now first in Qualified (${q1.join(', ')})`)
  const leadTotalsAfter = await column('Lead').locator('header p').textContent()
  check(leadTotalsAfter !== leadTotalsBefore, `Lead totals updated (${leadTotalsBefore} -> ${leadTotalsAfter})`)

  await page.reload()
  await column('Qualified').locator('li').first().waitFor()
  await page.waitForTimeout(300)
  check((await titles('Qualified'))[0] === moving, 'move persisted after reload')

  // 2) reorder within Qualified: drag first card to the last card
  const before = await titles('Qualified')
  await drag(column('Qualified').locator('li').first(), column('Qualified').locator('li').last(), { below: true })
  await page.waitForTimeout(1200)
  await page.reload()
  await column('Qualified').locator('li').first().waitFor()
  await page.waitForTimeout(300)
  const after = await titles('Qualified')
  check(after[after.length - 1] === before[0], `reorder within column persisted (${after.join(', ')})`)

  // 3) drag into Won -> closed date shows
  const negotiation = await titles('Negotiation')
  await drag(column('Negotiation').locator('li').first(), column('Won').locator('header'))
  await page.getByText('Moved to Won').waitFor()
  await page.waitForTimeout(500)
  const wonCard = column('Won').locator('li', { hasText: negotiation[0] })
  check((await wonCard.textContent()).includes('closed'), 'won card shows closed date')

  // 4) a click (no drag) opens the deal's page
  const clicked = (await titles('Lead'))[0]
  await column('Lead').locator('li [aria-roledescription]').first().click()
  await page.getByRole('heading', { name: clicked }).waitFor()
  check(/\/deals\/\d+$/.test(page.url()), `click opens the deal page (${clicked})`)
  await page.goBack()
  await column('Lead').locator('li').first().waitFor()

  // 5) keyboard: focus a card, ArrowRight -> next stage; focus stays on the card
  const kbTitle = (await titles('Lead'))[0]
  await column('Lead').locator('li [aria-roledescription]').first().focus()
  await page.keyboard.press('ArrowRight')
  await page.getByText('Moved to Qualified').first().waitFor()
  await page.waitForTimeout(500)
  check((await titles('Qualified')).includes(kbTitle), `keyboard: "${kbTitle}" moved to Qualified`)
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  check(focused.startsWith(kbTitle), `focus follows the moved card (${focused})`)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(1200)
  const q = await titles('Qualified')
  check(q.indexOf(kbTitle) === 1, `ArrowDown reorders within the column (${q.join(', ')})`)

  // 6) add deal from a column
  await column('Proposal').getByRole('button', { name: 'Add deal' }).click()
  const dialog = page.getByRole('dialog', { name: 'New deal' })
  check((await dialog.getByLabel('Stage').inputValue()) === 'proposal', 'column add preselects stage')
  await dialog.getByLabel(/Title/).fill('E2E board deal')
  await dialog.getByLabel(/Value/).fill('1234.5')
  await dialog.getByLabel('Currency').selectOption('USD')
  await dialog.getByLabel(/Contact/).selectOption({ index: 1 })
  await dialog.getByRole('button', { name: 'Save' }).click()
  await column('Proposal').getByText('E2E board deal').waitFor()
  check((await column('Proposal').textContent()).includes('1,234.50 USD'), 'new deal appears in its column')
  await shot(page, 'p8-board-after')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
