// Quotes: business details, line-item editor with live totals, printable page / PDF, WhatsApp text.
import { BASE, SHOTS, check, login, saveFailure, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')
const api = (path, init = {}) =>
  page.evaluate(
    async ([path, init]) => {
      const response = await fetch(`/api${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('crm.token')}`,
          'Content-Type': 'application/json',
        },
      })
      return response.status === 204 ? null : response.json()
    },
    [path, init],
  )

try {
  await login(page, 'admin@example.com', 'admin123')

  // 1. business details (admin, Settings)
  await page.goto(`${BASE}/settings`)
  const business = main.locator('form', {
    has: page.getByLabel('Business name'),
  })
  await business.getByLabel('Business name').fill('Dao Coffee Co.')
  await business.getByLabel('Address').fill('Nongbone Road\nVientiane')
  await business.getByLabel('Phone').fill('021 555 123')
  await business.getByLabel('Standard terms').fill('Pay to BCEL 010-12-00-1234567')
  await business.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Business details saved').waitFor()
  check(true, 'admin saves business details')

  // 2. a new quote starts from the deal
  const { items: deals } = await api('/deals?size=1&stage=proposal')
  const deal = deals[0]
  // a value different from the quote's total, so "Use total as deal value" is offered
  await api(`/deals/${deal.id}`, { method: 'PATCH', body: JSON.stringify({ value: '1000' }) })
  await page.goto(`${BASE}/deals/${deal.id}`)
  await main.getByRole('link', { name: 'New quote' }).click()
  await page.getByRole('heading', { name: 'New quote' }).waitFor()
  check(
    (await page.getByLabel('Description 1').inputValue()) === deal.title,
    'first line is prefilled with the deal',
  )

  // 3. lines, discount and VAT; totals update while typing
  await page.getByLabel('Description 1').fill('Coffee beans 1 kg')
  await page.getByLabel('Qty 1').fill('3')
  await page.getByLabel('Unit price 1').fill('150,000')
  await main.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Description 2').fill('Delivery')
  await page.getByLabel('Unit price 2').fill('25000.50')
  await page.getByLabel(/^Discount/).fill('5000.50')
  await page.getByLabel('VAT (%)').fill('10')
  const totalRow = main.locator('dl div', { hasText: /^Total/ })
  check(/517,000/.test(await totalRow.innerText()), `live total (${await totalRow.innerText()})`)
  await page.screenshot({ path: `${SHOTS}quote-editor.png`, fullPage: true })

  // a bad line is caught before saving
  await page.getByLabel('Qty 2').fill('0')
  await main.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Enter a number above 0').waitFor()
  check(true, 'quantity 0 is rejected')
  await page.getByLabel('Qty 2').fill('1')
  await main.getByRole('button', { name: 'Save' }).click()

  // 4. the quote page
  const doc = main.getByRole('article')
  await doc.waitFor()
  const docText = await doc.innerText()
  const number = /Q-\d{4}-\d{4}/.exec(docText)?.[0]
  check(Boolean(number), `quote gets a number (${number})`)
  check(/\/quotes\/\d+$/.test(page.url()), 'lands on the quote')
  for (const text of [
    'Dao Coffee Co.',
    'Nongbone Road',
    'Coffee beans 1 kg',
    'Delivery',
    'BCEL',
    deal.contact.name,
  ]) {
    check(docText.includes(text), `quote shows "${text}"`)
  }
  check(/VAT 10%/.test(docText) && /517,000/.test(docText), 'VAT line and total printed')
  await page.screenshot({ path: `${SHOTS}quote-page.png`, fullPage: true })

  // 5. WhatsApp: the quote as a readable message
  const wa = await main.getByRole('link', { name: 'Send on WhatsApp' }).getAttribute('href')
  const message = decodeURIComponent(wa.split('?text=')[1] ?? '')
  check(wa.startsWith('https://wa.me/'), `WhatsApp link (${wa.slice(0, 40)}…)`)
  check(message.includes(number) && /Total: 517,000/.test(message), 'message has number and total')

  // 6. printing shows only the document
  await page.emulateMedia({ media: 'print' })
  check(
    !(await main.getByRole('button', { name: /Print/ }).isVisible()),
    'toolbar hidden when printing',
  )
  check(
    !(await page.getByRole('navigation', { name: 'Main' }).isVisible()),
    'menu hidden when printing',
  )
  await page.pdf({
    path: `${SHOTS}quote.pdf`,
    format: 'A4',
    printBackground: true,
  })
  await page.emulateMedia({ media: 'screen' })

  // 7. the deal can take the quote's total as its value
  await main.getByRole('button', { name: 'Use total as deal value' }).click()
  await page.getByText('Deal value updated').waitFor()
  const updated = await api(`/deals/${deal.id}`)
  check(/^517000\.00$/.test(updated.value), `deal value updated (${updated.value})`)
  check(
    !(await main.getByRole('button', { name: 'Use total as deal value' }).isVisible()),
    'button goes away once they match',
  )

  // 8. editing keeps the number
  await main.getByRole('link', { name: 'Edit' }).click()
  await page.getByLabel('Description 2').fill('Delivery (Vientiane)')
  await main.getByRole('button', { name: 'Save' }).click()
  await doc.getByRole('cell', { name: 'Delivery (Vientiane)' }).waitFor()
  check((await doc.innerText()).includes(number), 'number kept after editing')

  // 9. listed on the deal; phone layout fits
  await page.goto(`${BASE}/deals/${deal.id}`)
  await main.getByRole('link', { name: number }).waitFor()
  check(true, 'deal page lists the quote')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/deals/${deal.id}/quotes/new`)
  await page.getByLabel('Description 1').waitFor()
  const editorFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  check(editorFits, 'quote editor fits a phone')
  await page.screenshot({
    path: `${SHOTS}quote-editor-phone.png`,
    fullPage: true,
  })
  await page.goto(`${BASE}/deals/${deal.id}`)
  await main.getByRole('link', { name: number }).click()
  await doc.waitFor()
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  check(fits, 'quote page fits a phone')
  await page.screenshot({
    path: `${SHOTS}quote-page-phone.png`,
    fullPage: true,
  })

  // 10. delete
  await main.getByRole('button', { name: 'Delete quote' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByText('Quote deleted').waitFor()
  check(page.url().endsWith(`/deals/${deal.id}`), 'back on the deal after deleting')
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
