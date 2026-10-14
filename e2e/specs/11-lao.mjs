// The whole app in Lao: switching, persistence, no English left on screen, readable fonts,
// server errors in Lao, and the layout still fits on a phone.
import { BASE, check, login, saveFailure, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start({ width: 1366, height: 900, initialLocale: null })
const main = page.locator('main')
const hasLao = (text) => /[຀-໿]/.test(text)

/** Every word that appears in the app's own data (names, deals, notes ...): data is not interface text. */
async function dataWords() {
  const token = await page.evaluate(() => localStorage.getItem('crm.token'))
  const headers = { Authorization: `Bearer ${token}` }
  const words = new Set()
  const collect = (value) => {
    if (typeof value === 'string') for (const w of value.match(/[A-Za-z]{3,}/g) ?? []) words.add(w)
    else if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') Object.values(value).forEach(collect)
  }
  for (const path of ['contacts?size=100', 'companies?size=100', 'deals?size=100', 'activities?size=100', 'users?size=100', 'tags', 'dashboard/summary']) {
    collect(await (await page.request.get(`${BASE}/api/${path}`, { headers })).json())
  }
  return words
}

/** Latin words (3+ letters) visible in the page text that are neither data nor things that stay Latin. */
async function englishLeft(data) {
  const text = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && el.offsetParent !== null)
      .map((el) => el.textContent ?? '')
      .join(' '),
  )
  const keep = new Set(['Mini', 'CRM', 'CSV', 'UTF', 'Esc', 'Enter', 'Tab', 'Ctrl', 'LAK', 'THB', 'USD', 'first', 'name'])
  const words = text.match(/[A-Za-z]{3,}/g) ?? []
  return [...new Set(words.filter((w) => !keep.has(w) && !data.has(w)))]
}

try {
  // first visit: follows the browser's language (lo -> Lao, en -> English), unless the stack was
  // built with APP_LOCALE, which wins (run with E2E_APP_LOCALE=lo in that case)
  const forced = process.env.E2E_APP_LOCALE
  const expected = { 'lo-LA': forced ?? 'lo', 'en-US': forced ?? 'en' }
  const headings = { lo: /ເຂົ້າສູ່ລະບົບ/, en: /Sign in/ }
  for (const locale of ['lo-LA', 'en-US']) {
    const context = await browser.newContext({ locale })
    const fresh = await context.newPage()
    await fresh.goto(`${BASE}/login`)
    await fresh.getByRole('heading', { name: headings[expected[locale]] }).waitFor()
    await context.close()
  }
  check(true, `first visit language (${forced ? `forced to ${forced}` : 'follows the browser'})`)

  // the login page offers the switch in Lao script, and remembers the choice
  await page.goto(`${BASE}/login`)
  await page.getByRole('button', { name: 'ລາວ' }).click()
  await page.getByRole('heading', { name: /ເຂົ້າສູ່ລະບົບ/ }).waitFor()
  check((await page.locator('html').getAttribute('lang')) === 'lo', '<html lang> becomes "lo"')
  check(hasLao(await page.getByLabel('ອີເມວ').evaluate((el) => el.labels[0].textContent)), 'login form is in Lao')
  await shot(page, 'lao-login')

  // wrong password: the server's error shows in Lao
  await page.getByLabel('ອີເມວ').fill('admin@example.com')
  await page.getByLabel('ລະຫັດຜ່ານ').fill('wrong-password')
  await page.getByRole('button', { name: 'ເຂົ້າສູ່ລະບົບ' }).click()
  await page.getByRole('alert').waitFor()
  const loginError = await page.getByRole('alert').textContent()
  check(hasLao(loginError) && !/[A-Za-z]{4,}/.test(loginError), `wrong password error is in Lao (${loginError})`)

  await page.getByLabel('ລະຫັດຜ່ານ').fill('admin123')
  await page.getByRole('button', { name: 'ເຂົ້າສູ່ລະບົບ' }).click()
  await main.getByRole('heading', { name: 'ພາບລວມ' }).waitFor()
  await page.reload()
  await main.getByRole('heading', { name: 'ພາບລວມ' }).waitFor()
  check(true, 'Lao is remembered after reload')
  await main.locator('.recharts-bar-rectangle').first().waitFor()
  await page.waitForTimeout(600)
  await shot(page, 'lao-dashboard')
  const data = await dataWords()
  const left = await englishLeft(data)
  check(left.length === 0, `no English words left on the dashboard (${left.join(', ')})`)

  // every main page: Lao heading, no English left, fonts really are Lao-capable
  const pages = [
    ['/contacts', 'ລູກຄ້າ'], ['/companies', 'ບໍລິສັດ'], ['/pipeline', 'ຂັ້ນຕອນການຂາຍ'],
    ['/tasks', 'ວຽກທີ່ຕ້ອງເຮັດ'], ['/users', 'ຜູ້ໃຊ້ລະບົບ'], ['/settings', 'ຕັ້ງຄ່າ'],
  ]
  for (const [path, heading] of pages) {
    await page.goto(`${BASE}${path}`)
    await main.getByRole('heading', { name: heading, exact: true }).waitFor()
    await page.waitForTimeout(700)
    await shot(page, `lao${path.replaceAll('/', '-')}`)
    const demoData = await englishLeft(data)
    check(demoData.length === 0, `${path}: no untranslated interface text (${demoData.join(', ')})`)
  }

  // Lao glyphs come from a real Lao font (ours or the system's), not tofu boxes
  const font = await page.evaluate(async () => {
    await document.fonts.ready
    return {
      loaded: [...document.fonts].filter((f) => f.family.includes('Noto Sans Lao') && f.status === 'loaded').length,
      sample: document.fonts.check("16px 'Noto Sans Lao'", 'ພາສາລາວ'),
    }
  })
  check(font.sample, `Lao font available (${font.loaded} weights loaded)`)

  // a detail page, a form and a CSV dialog
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('table').waitFor()
  await main.getByRole('button', { name: 'ເພີ່ມລູກຄ້າ' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click()
  check(await dialog.getByText('ກະລຸນາໃສ່ຊື່').isVisible(), 'form validation message in Lao')
  await shot(page, 'lao-contact-form')
  await page.keyboard.press('Escape')
  await main.getByRole('button', { name: 'ນຳເຂົ້າຈາກໄຟລ໌ CSV' }).click()
  await page.getByRole('dialog').getByText('ຖັນໃນແຖວທຳອິດ').waitFor()
  await shot(page, 'lao-csv')
  await page.keyboard.press('Escape')
  await main.locator('tbody tr').first().click()
  await main.getByRole('heading', { name: 'ກິດຈະກຳ' }).waitFor()
  await shot(page, 'lao-contact-detail')

  // currency shown as ກີບ in Lao, LAK in English; switching back restores English
  await page.goto(`${BASE}/pipeline`)
  await main.getByText(/ກີບ/).first().waitFor()
  check(!(await main.textContent()).includes('LAK'), 'amounts are shown in ກີບ, not LAK')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await main.getByRole('heading', { name: 'Pipeline' }).waitFor()
  check((await main.textContent()).includes('LAK'), 'switching to English brings back LAK')
  await page.getByRole('button', { name: 'ລາວ' }).click()
  await main.getByRole('heading', { name: 'ຂັ້ນຕອນການຂາຍ' }).waitFor()

  // phone width: nothing spills sideways in Lao either (longer words)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/', '/contacts', '/tasks', '/users', '/settings']) {
    await page.goto(`${BASE}${path}`)
    await main.getByRole('heading').first().waitFor()
    await page.waitForTimeout(500)
    const { scroll, width } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }))
    check(scroll <= width, `Lao ${path} fits a phone (${scroll}/${width})`)
  }
  await shot(page, 'lao-phone')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
