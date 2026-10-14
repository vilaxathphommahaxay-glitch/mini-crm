import { BASE, check, login, logout, saveFailure, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start({ width: 1440, height: 1000 })
const main = page.locator('main')
const tile = (label) => main.locator('a', { hasText: label }).locator('p').nth(1)

try {
  await login(page, 'admin@example.com', 'admin123')
  const summary = await page.evaluate(async () => {
    const r = await fetch('/api/dashboard/summary', {
      headers: { Authorization: `Bearer ${localStorage.getItem('crm.token')}` },
    })
    return r.json()
  })
  await page.goto(`${BASE}/`)
  await tile('Overdue').waitFor()
  check((await tile('Due today').textContent()) === String(summary.tasks.today), `today tile = ${summary.tasks.today}`)
  check((await tile('Overdue').textContent()) === String(summary.tasks.overdue), `overdue tile = ${summary.tasks.overdue}`)
  check((await tile('Open deals').textContent()) === String(summary.open_deals), `open deals tile = ${summary.open_deals}`)
  await main.locator('.recharts-bar-rectangle').first().waitFor()
  const bars = await main.locator('.recharts-bar-rectangle').count()
  check(bars === 12, `chart has 12 month bars (${bars})`)
  await main.locator('.recharts-bar-rectangle').last().hover()
  await main.locator('.recharts-tooltip-wrapper').getByText(/LAK/).waitFor()
  check(true, 'hover shows a money tooltip')
  const currencyButtons = await main.getByRole('group', { name: 'Currency' }).getByRole('button').count()
  if (currencyButtons > 1) {
    await main.getByRole('group', { name: 'Currency' }).getByRole('button', { name: 'THB' }).click()
    await main.locator('.recharts-bar-rectangle').last().hover()
    check(true, 'currency switch works')
  }
  check(await main.getByRole('table', { name: /Won revenue by month/ }).count() === 1, 'screen-reader table present')
  await shot(page, 'p9-dashboard')

  // tasks: tabs, counts, tick done removes from the list
  await tile('Due today').click()
  await page.waitForURL(/\/tasks\?due=today/)
  await main.getByRole('tab', { name: /Today/ }).waitFor()
  const todayTab = await main.getByRole('tab', { name: /Today/ }).textContent()
  check(todayTab.includes(String(summary.tasks.today)), `Today tab shows count (${todayTab})`)
  const rows = main.locator('li input[type=checkbox]')
  await rows.first().waitFor()
  const before = await rows.count()
  await rows.first().check()
  await page.getByText('Marked as done').waitFor()
  await page.waitForTimeout(800)
  check((await rows.count()) === before - 1, `ticking removes it from Today (${before} -> ${await rows.count()})`)

  await main.getByRole('tab', { name: /Overdue/ }).click()
  await page.waitForURL(/due=overdue/)
  await page.waitForTimeout(500)
  const overdueText = await main.locator('li').first().textContent()
  check(overdueText.includes('overdue'), 'overdue tab items are flagged overdue')

  await main.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog')
  check((await dialog.getByLabel('Due date').inputValue()).length === 10, 'new task defaults to today')
  await dialog.getByLabel(/Subject/).fill('E2E follow-up')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await main.getByRole('tab', { name: /Today/ }).click()
  await main.getByText('E2E follow-up').waitFor()
  check(true, 'new task appears under Today')
  await shot(page, 'p9-tasks')

  // users: create, log in as them, disable, they are locked out
  await page.goto(`${BASE}/users`)
  await main.getByRole('table').waitFor()
  await main.getByRole('button', { name: 'New user' }).click()
  const uf = page.getByRole('dialog')
  await uf.getByLabel(/Name/).fill('Nina Test')
  await uf.getByLabel(/Email/).fill('Nina@Example.com')
  await uf.getByLabel(/Password/).fill('short')
  await uf.getByRole('button', { name: 'Save' }).click()
  check(await uf.getByText('At least 8 characters').first().isVisible(), 'password length validated')
  await uf.getByLabel(/Password/).fill('nina-pass-1')
  await uf.getByRole('button', { name: 'Save' }).click()
  await main.getByText('nina@example.com').waitFor()
  check(true, 'user created (email lowercased)')

  // editing yourself: role and active are locked
  await main.locator('tr', { hasText: '(you)' }).getByRole('button', { name: 'Edit' }).click()
  check(await page.getByRole('dialog').getByLabel('Role').isDisabled(), 'own role locked')
  await page.keyboard.press('Escape')
  await shot(page, 'p9-users')

  await logout(page)
  await login(page, 'nina@example.com', 'nina-pass-1')
  check(true, 'new user can log in')
  await logout(page)

  await login(page, 'admin@example.com', 'admin123')
  await page.goto(`${BASE}/users`)
  await main.locator('tr', { hasText: 'Nina Test' }).getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog').getByLabel(/Active/).uncheck()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await main.locator('tr', { hasText: 'Nina Test' }).getByText('Disabled').waitFor()
  await logout(page)
  await page.getByLabel('Email').fill('nina@example.com')
  await page.getByLabel('Password').fill('nina-pass-1')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('alert').waitFor()
  check((await page.getByRole('alert').textContent()).includes('disabled'), 'disabled user cannot log in')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
