// Call / WhatsApp buttons, and the pieces that make the app installable on a phone.
import { BASE, check, login, saveFailure, start } from '../lib.mjs'

const { browser, page, problems } = await start({ width: 390, height: 844 })
const main = page.locator('main')

try {
  // web app manifest and icons are served correctly
  const manifestResponse = await page.request.get(`${BASE}/manifest.webmanifest`)
  const manifest = await manifestResponse.json()
  check(
    manifestResponse.ok() && manifest.display === 'standalone',
    'manifest is served (standalone app)',
  )
  check(
    /json/.test(manifestResponse.headers()['content-type'] ?? ''),
    `manifest content-type (${manifestResponse.headers()['content-type']})`,
  )
  for (const icon of manifest.icons) {
    const r = await page.request.get(`${BASE}${icon.src}`)
    check(
      r.ok() && r.headers()['content-type'] === 'image/png',
      `icon ${icon.src} (${icon.purpose})`,
    )
  }
  await page.goto(`${BASE}/login`)
  check((await page.locator('link[rel="manifest"]').count()) === 1, 'pages link the manifest')

  // a contact with a local-format Lao number gets working Call and WhatsApp buttons
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'New contact' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel(/First name/).fill('Ketmany')
  await form.getByLabel('Phone').fill('020 5555 1234')
  await form.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Ketmany' }).waitFor()

  const call = main.getByRole('link', { name: 'Call' })
  const whatsapp = main.getByRole('link', { name: 'WhatsApp' })
  check(
    (await call.getAttribute('href')) === 'tel:02055551234',
    `Call button dials (${await call.getAttribute('href')})`,
  )
  check(
    (await whatsapp.getAttribute('href')) === 'https://wa.me/8562055551234',
    `WhatsApp opens the chat (${await whatsapp.getAttribute('href')})`,
  )
  check((await whatsapp.getAttribute('target')) === '_blank', 'WhatsApp opens in a new tab/app')

  // tapping Call also opens the log form, filled in, so the call gets recorded afterwards
  // (a headless browser has no phone app: its tel: handling would swallow later clicks, so the
  // dialling itself is skipped here; the href is checked above)
  await call.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true }))
  await call.click()
  const log = page.getByRole('dialog')
  await log.getByText('Note how it went').waitFor()
  check(
    (await log.getByLabel(/Subject/).inputValue()) === 'Call with Ketmany',
    'log form is filled in',
  )
  await log.getByLabel('Details').fill('Wants 20 kg next week')
  await log.getByRole('button', { name: 'Save' }).click()
  await main.getByText('Wants 20 kg next week').waitFor()
  check(true, 'call logged on the timeline')

  // no phone number -> no buttons
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'New contact' }).click()
  await form.getByLabel(/First name/).fill('Nophone')
  await form.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Nophone' }).waitFor()
  check(
    (await main.getByRole('link', { name: 'WhatsApp' }).count()) === 0,
    'no WhatsApp button without a phone',
  )

  // fits a phone screen
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }))
  check(scroll <= width, `contact page with buttons fits a phone (${scroll}/${width})`)
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
