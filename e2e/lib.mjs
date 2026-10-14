// Shared helpers for the browser tests (Playwright driving an installed Chrome or Edge).
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

export const BASE = process.env.BASE_URL ?? 'http://localhost:8080'
/** Screenshots and downloads made during a run (git-ignored). */
export const SHOTS = fileURLToPath(new URL('./.output/', import.meta.url))
mkdirSync(SHOTS, { recursive: true })

// Which installed browser to drive: "chrome", "msedge", or "chromium" (after
// `npx playwright install chromium`). Defaults to Edge on Windows, Chrome elsewhere.
const CHANNEL = process.env.E2E_BROWSER ?? (process.platform === 'win32' ? 'msedge' : 'chrome')

export async function start({ width = 1366, height = 860 } = {}) {
  const browser = await chromium.launch({
    channel: CHANNEL === 'chromium' ? undefined : CHANNEL,
    headless: process.env.HEADED !== '1',
  })
  const page = await browser.newPage({
    viewport: { width, height },
    // E2E_TZ=UTC reproduces CI, whose runners use UTC
    ...(process.env.E2E_TZ ? { timezoneId: process.env.E2E_TZ } : {}),
  })
  const problems = []
  // 'Failed to load resource' is just the browser logging an expected 4xx; 5xx is caught below
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
      problems.push(`console: ${m.text()}`)
    }
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) {
      problems.push(`HTTP ${r.status()} ${r.url()}`)
    }
  })
  return { browser, page, problems }
}

export async function login(page, email, password) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.locator('main h1').first().waitFor()
}

export async function logout(page) {
  await page.getByRole('button', { name: 'Log out' }).first().click()
  await page.getByRole('heading', { name: /sign in/i }).waitFor()
}

let step = 0
export function check(condition, message) {
  step++
  if (!condition) throw new Error(`step ${step} failed: ${message}`)
  console.log(`  ok ${step} - ${message}`)
}

export async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true })
}

/** On failure: screenshot + HTML of the page, named after the spec, for CI artifacts. */
export async function saveFailure(page) {
  const name = `FAILED-${basename(process.argv[1], '.mjs')}`
  try {
    await page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true })
    writeFileSync(`${SHOTS}${name}.html`, await page.content())
    console.log(`  saved ${name}.png/.html`)
  } catch (error) {
    console.log(`  could not save failure output: ${error.message}`)
  }
}
