// Files and photos on a contact: upload (incl. a few MB through nginx), preview, download,
// unsafe types refused, delete, and the change shows in the contact's history.
import { BASE, check, login, saveFailure, SHOTS, start } from '../lib.mjs'

const { browser, page, problems } = await start()
const main = page.locator('main')
// a real 1x1 PNG, a minimal PDF, a 3 MB text file, and something that must be refused
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const files = [
  { name: 'shop-front.png', mimeType: 'image/png', buffer: PNG },
  { name: 'ສັນຍາ.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') },
  { name: 'price-list.txt', mimeType: 'text/plain', buffer: Buffer.alloc(3_000_000, 'a') },
]

try {
  await login(page, 'somchai@example.com', 'staff123')
  await page.goto(`${BASE}/contacts`)
  await main.getByRole('button', { name: 'New contact' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel(/First name/).fill('Filetest')
  await form.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Filetest' }).waitFor()
  await main.getByText('No files yet').waitFor()

  // upload three files at once
  await main.getByLabel('Add file or photo').setInputFiles(files)
  await page.getByText('3 files added').waitFor()
  for (const file of files) {
    await main.getByRole('button', { name: `Open ${file.name}` }).waitFor()
  }
  check(true, 'three files uploaded, including 3 MB through nginx')
  const thumb = main.locator('li', { hasText: 'shop-front.png' }).locator('img')
  await thumb.waitFor()
  check((await thumb.getAttribute('src')).startsWith('blob:'), 'photo shows a thumbnail')
  check(
    /3\.0 MB · Somchai Vongsa/.test(
      await main.locator('li', { hasText: 'price-list.txt' }).innerText(),
    ),
    'size and uploader shown',
  )
  await page.screenshot({ path: `${SHOTS}files.png`, fullPage: true })

  // a photo opens in the app; a PDF downloads with its Lao name
  await main.getByRole('button', { name: 'Open shop-front.png' }).click()
  await page.getByRole('dialog').getByRole('img', { name: 'shop-front.png' }).waitFor()
  check(true, 'photo opens in a preview')
  await page.keyboard.press('Escape')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    main.getByRole('button', { name: 'Open ສັນຍາ.pdf' }).click(),
  ])
  check(
    download.suggestedFilename() === 'ສັນຍາ.pdf',
    `PDF downloads (${download.suggestedFilename()})`,
  )

  // unsafe files are refused with a clear message
  await main
    .getByLabel('Add file or photo')
    .setInputFiles({ name: 'setup.exe', mimeType: 'application/octet-stream', buffer: PNG })
  await page.getByText(/setup\.exe: This kind of file can't be attached/).waitFor()
  check(true, '.exe refused')

  // delete one; history records adding and removing
  await main.getByRole('button', { name: 'Delete price-list.txt' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await page.getByText('File deleted').waitFor()
  check(
    (await main.getByRole('button', { name: 'Open price-list.txt' }).count()) === 0,
    'file removed from the list',
  )
  await main.getByRole('button', { name: 'Show history' }).click()
  const history = main.getByRole('listitem').filter({ hasText: /Files and photos:/ })
  await history.first().waitFor()
  const lines = (await history.allInnerTexts()).join('\n')
  check(lines.includes('removed price-list.txt'), 'history: file removed')
  check(/added .*shop-front\.png/.test(lines), 'history: files added')

  // phone layout
  await page.setViewportSize({ width: 390, height: 844 })
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  check(fits, 'contact page with files fits a phone')
  check(problems.length === 0, `no console/page/5xx errors ${problems.join(' | ')}`)
} catch (error) {
  await saveFailure(page)
  throw error
} finally {
  await browser.close()
}
