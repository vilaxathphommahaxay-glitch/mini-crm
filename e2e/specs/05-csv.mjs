import { readFileSync, writeFileSync } from 'node:fs'
import { BASE, SHOTS, check, login, shot, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')

try {
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/contacts?tag=vip`)
  await main.getByRole('table').waitFor()
  const visibleVip = await main.locator('tbody tr').count()

  // export respects the tag filter, has a BOM and a dated filename
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    main.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = `${SHOTS}export.csv`
  await download.saveAs(path)
  const raw = readFileSync(path)
  check(raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf, 'export starts with a UTF-8 BOM')
  check(/^contacts-\d{4}-\d{2}-\d{2}\.csv$/.test(download.suggestedFilename()), `filename ${download.suggestedFilename()}`)
  const lines = raw.toString('utf8').trim().split('\r\n')
  check(lines.length - 1 === visibleVip, `exported ${lines.length - 1} rows = ${visibleVip} shown with tag=vip`)

  // template download
  await main.getByRole('button', { name: 'Import CSV' }).click()
  const dialog = page.getByRole('dialog')
  const [template] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download a template' }).click(),
  ])
  check(template.suggestedFilename() === 'contacts-template.csv', 'template downloads')
  check(await dialog.getByRole('button', { name: 'Import' }).isDisabled(), 'Import disabled until a file is chosen')

  // import: Lao name, new company, invalid email, duplicate of an existing email
  const existingEmail = lines.slice(1).map((l) => l.split(',')[2]).find((e) => e.includes('@'))
  check(Boolean(existingEmail), `found an existing email to duplicate (${existingEmail})`)
  const file = `${SHOTS}import.csv`
  writeFileSync(
    file,
    '﻿' +
      'first_name,last_name,email,phone,company,tags,notes\r\n' +
      'ສົມໃຈ,ພົມມະຈັນ,somjai@example.la,+856 20 777,Nam Theun Cafe,vip;cafe,"Likes, commas"\r\n' +
      'Broken,,not-an-email,,,,\r\n' +
      `Copy,,${existingEmail},,,,\r\n`,
    'utf8',
  )
  await dialog.getByLabel('CSV file').setInputFiles(file)
  check((await dialog.textContent()).includes('import.csv'), 'chosen file name shown')
  await dialog.getByRole('button', { name: 'Import' }).click()
  await dialog.getByText('Rows that were skipped').waitFor()
  const summary = await dialog.locator('dl').textContent()
  check(summary.includes('Imported1') && summary.includes('Skipped2') && summary.includes('New companies1'), `result summary (${summary})`)
  const errorsText = await dialog.locator('ul').last().textContent()
  check(errorsText.includes('Row 3') && errorsText.includes('Row 4') && errorsText.includes('Duplicate'), 'row errors listed')
  await shot(page, 'p10-import-result')
  await dialog.getByRole('button', { name: 'Done' }).click()

  // the list refreshes; the Lao contact is searchable
  await page.goto(`${BASE}/contacts`)
  await page.getByLabel('Search contacts').fill('ສົມໃຈ')
  await main.getByRole('link', { name: 'ສົມໃຈ ພົມມະຈັນ' }).waitFor()
  await main.getByRole('link', { name: 'ສົມໃຈ ພົມມະຈັນ' }).click()
  await page.getByRole('heading', { name: 'ສົມໃຈ ພົມມະຈັນ' }).waitFor()
  check(await main.getByText('Nam Theun Cafe').first().isVisible(), 'imported contact has its new company')
  check(await main.getByText('Likes, commas').isVisible(), 'quoted notes with comma survive')
  await shot(page, 'p10-imported-contact')

  // a non-CSV file gets a clear error
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'Import CSV' }).click()
  const bad = `${SHOTS}bad.csv`
  writeFileSync(bad, Buffer.from([0x41, 0xe5, 0x0a, 0xff, 0xfe]))
  await page.getByRole('dialog').getByLabel('CSV file').setInputFiles(bad)
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click()
  await page.getByRole('dialog').getByRole('alert').waitFor()
  check((await page.getByRole('dialog').getByRole('alert').textContent()).length > 5, 'bad file shows an error message')

  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} finally {
  await browser.close()
}
