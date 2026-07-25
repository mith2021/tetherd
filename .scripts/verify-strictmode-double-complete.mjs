import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

// Repro: a focus session that finishes while the tab is closed/backgrounded is
// caught by a mount-time effect in useTimer.ts (`restoredFinishedElsewhere`).
// That effect has an empty dependency array and no idempotency guard. React
// StrictMode (enabled in main.tsx) double-invokes mount effects in dev, so if
// this effect isn't guarded, the finished session gets logged twice instead
// of once.

// Some sandboxed containers pre-install Chromium outside Playwright's normal
// cache and expect scripts to point at it directly rather than downloading.
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(CONTAINER_CHROMIUM) ? { executablePath: CONTAINER_CHROMIUM } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// Seed localStorage: a focus session whose endTime is 5s in the past (finished
// while "away"), and a clean stats object, then reload so useTimer mounts
// fresh and picks up the restoredFinishedElsewhere path.
await page.evaluate(() => {
  localStorage.setItem('pomo-stats', JSON.stringify({ sessions: [], tasksCompletedByDay: {} }))
  localStorage.removeItem('pomo-stats__backup')
  localStorage.setItem(
    'pomo-timer-state-v1',
    JSON.stringify({
      sessionType: 'focus',
      focusCount: 0,
      secondsLeft: 0,
      endTime: Date.now() - 5000,
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('pomo-stats')))
const focusSessions = stats.sessions.length
console.log('sessions recorded for the one finished-while-away session:', focusSessions)
console.log(focusSessions === 1 ? 'PASS: recorded exactly once' : `FAIL: expected 1, got ${focusSessions}`)
console.log('errors:', errors.length ? errors : 'none')

await browser.close()
process.exit(focusSessions === 1 && errors.length === 0 ? 0 : 1)
