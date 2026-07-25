import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

// End-to-end regression guard for src/hooks/useTimer.ts's core promise: a
// focus session must be recorded exactly once, with a sane duration, no
// matter how it ends. Drives the real app + real localStorage (no mocking)
// against two scenarios that are easy to silently break:
//   1. paused, reloaded, resumed, then run to natural completion
//   2. skipped early (partial elapsed time credited, not the full duration)

// Some sandboxed containers pre-install Chromium outside Playwright's normal
// cache and expect scripts to point at it directly rather than downloading.
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(CONTAINER_CHROMIUM) ? { executablePath: CONTAINER_CHROMIUM } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

async function resetStats() {
  await page.evaluate(() => {
    localStorage.setItem('pomo-stats', JSON.stringify({ sessions: [], tasksCompletedByDay: {} }))
    localStorage.removeItem('pomo-stats__backup')
  })
}

async function readSessions() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('pomo-stats')).sessions)
}

let pass = true

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// --- Scenario 1: paused, reloaded, resumed, run to natural completion ---
await resetStats()
await page.evaluate(() => {
  localStorage.setItem(
    'pomo-timer-state-v1',
    JSON.stringify({ sessionType: 'focus', focusCount: 0, secondsLeft: 3, endTime: null })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.click('button:has-text("Start")')
await page.waitForFunction(
  () => document.title.startsWith('Session complete') || document.title === 'Tetherd',
  { timeout: 8000 }
)
await page.waitForTimeout(300)
const scenario1 = await readSessions()
const s1ok = scenario1.length === 1
console.log(
  `scenario 1 (pause/reload/resume/complete): ${scenario1.length} session(s) recorded —`,
  s1ok ? 'PASS' : `FAIL (expected 1)`
)
pass = pass && s1ok

// --- Scenario 2: skip early credits only elapsed time, exactly once ---
await resetStats()
await page.evaluate(() => localStorage.removeItem('pomo-timer-state-v1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.click('button:has-text("Start")')
await page.waitForTimeout(2200)
await page.keyboard.press('s')
await page.waitForTimeout(300)
const scenario2 = await readSessions()
const totalFocusSecs = 25 * 60
const s2ok =
  scenario2.length === 1 && scenario2[0].durationSec > 0 && scenario2[0].durationSec < totalFocusSecs
console.log(
  `scenario 2 (skip early): ${scenario2.length} session(s), durationSec=${scenario2[0]?.durationSec} —`,
  s2ok ? 'PASS' : 'FAIL (expected exactly 1 partial-duration session)'
)
pass = pass && s2ok

console.log('errors:', errors.length ? errors : 'none')
pass = pass && errors.length === 0

await browser.close()
process.exit(pass ? 0 : 1)
