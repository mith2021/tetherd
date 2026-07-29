import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

// Repro: the session-type pill row (Focus / Short Break / Long Break, shown
// by default via theme.showSessionPills) calls timer.switchType() directly,
// with no guard against doing so while a focus session is actively running.
// Unlike skip() -- which explicitly computes and records the elapsed focus
// time before advancing -- switchType() just resets state and persists a
// fresh session with no stats write at all. Clicking a different session
// pill mid-focus-session (an easy, ordinary UI interaction, not an edge
// case) silently discards however much focus time had already elapsed.

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

await resetStats()
// seed a short focus session (10s) so a few real seconds can elapse quickly
await page.evaluate(() => localStorage.removeItem('pomo-timer-state-v1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

await page.click('button:has-text("Start")')
// let ~3s of real focus time elapse before switching type
await page.waitForTimeout(3000)
await page.click('button:has-text("Short Break")')
await page.waitForTimeout(300)

const sessions = await readSessions()
const ok = sessions.length === 1 && sessions[0].durationSec > 0 && sessions[0].durationSec < 25 * 60
console.log(
  `after ~3s of focus then switching to Short Break: ${sessions.length} session(s), durationSec=${sessions[0]?.durationSec} —`,
  ok ? 'PASS' : 'FAIL (expected exactly 1 partial-duration session, elapsed focus time must not be silently dropped)'
)
pass = pass && ok

console.log('errors:', errors.length ? errors : 'none')
pass = pass && errors.length === 0

await browser.close()
process.exit(pass ? 0 : 1)
