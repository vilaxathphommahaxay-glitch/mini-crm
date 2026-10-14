import { BASE, check, login, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start({ width: 390, height: 844 })
try {
  await login(page, 'admin@example.com', 'admin123')
  for (const path of ['/', '/contacts', '/companies', '/tasks', '/users', '/settings', '/contacts/1']) {
    await page.goto(`${BASE}${path}`)
    await page.locator('main h1').first().waitFor()
    await page.waitForTimeout(700)
    const { scroll, width } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }))
    check(scroll <= width, `${path} fits ${width}px (scrollWidth ${scroll})`)
    await shot(page, `mobile${path.replaceAll('/', '-') || '-home'}`)
  }
  await page.goto(`${BASE}/pipeline`)
  await page.getByRole('region', { name: 'Lead column' }).waitFor()
  const pageScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  check(pageScroll, 'pipeline: only the board scrolls sideways, not the page')
  check(problems.length === 0, `no errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
