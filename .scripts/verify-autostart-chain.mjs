import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

// Repro: with autoStartBreaks + autoStartFocus on, a completed session
// auto-starts the next one via useTimer.ts's advance()->start(), all inside
// the same synchronous tick()->handleComplete()->finishCompletion() call.
// React 19 batches the setRunning(false) then setRunning(true) that happens
// in that call into a single re-render where `running`'s net value is
// unchanged (true before, true after) — so the effect that reschedules the
// rAF loop (keyed to `running`) never re-fires, and the countdown silently
// freezes forever after the very first auto-advance. Every session after the
// first in an auto-started chain then goes unrecorded — exactly the
// "silently dropped" failure this routine exists to catch.
//
// A second, independent bug hid behind the freeze: tick() is memoized once
// (useCallback with an empty dep array) so its rAF loop, once unfrozen,
// invoked the *first* render's handleComplete()/finishCompletion() closure
// forever — whose captured `sessionType` never advances past its initial
// value. Once the freeze is fixed, that stale closure treats every
// completion (including breaks) as if sessionType were still 'focus',
// logging each break as a second, spurious focus session — a "double
// counted" violation of the same mandate. Both need fixing together for a
// chain to record correctly: no freeze, no phantom extra sessions.

const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(CONTAINER_CHROMIUM) ? { executablePath: CONTAINER_CHROMIUM } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

let pass = true

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

await page.evaluate(() => {
  localStorage.setItem('pomo-stats', JSON.stringify({ sessions: [], tasksCompletedByDay: {} }))
  localStorage.removeItem('pomo-stats__backup')
  localStorage.removeItem('pomo-timer-state-v1')
  localStorage.setItem(
    'pomo-settings',
    JSON.stringify({
      focusMin: 2 / 60, // 2s
      shortBreakMin: 1 / 60, // 1s
      longBreakMin: 1 / 60,
      longBreakInterval: 100, // never hit a long break in this window
      autoStartBreaks: true,
      autoStartFocus: true,
      pauseOnTabAway: false,
      confirmPresenceOnComplete: false,
      presenceGraceSeconds: 120,
      webcamPresenceEnabled: false,
      webcamAwaySeconds: 15,
      dailyGoalSessions: 0,
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)

await page.click('button:has-text("Start")')

// Sample the title over the window a plain 3s cycle (2s focus + 1s break)
// repeats in, to prove the countdown keeps moving instead of freezing after
// the first auto-advance.
const titles = []
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000)
  titles.push(await page.title())
}
console.log('title samples over 10s:', titles)

const sawFocus = titles.some((t) => t.includes('Focus'))
const sawBreak = titles.some((t) => t.includes('Break'))
// Durations here are 1-2s and sampled every 1s, so the exact same title can
// legitimately reappear across separate sessions (e.g. "00:01 — Focus" shows
// up once per focus session) — that's not a freeze. A real freeze instead
// shows up as the *same* title several samples in a row, since a live
// countdown can't hold one value for more than ~2 consecutive 1s samples.
let maxRun = 1
let run = 1
for (let i = 1; i < titles.length; i++) {
  run = titles[i] === titles[i - 1] ? run + 1 : 1
  maxRun = Math.max(maxRun, run)
}
const notFrozen = sawFocus && sawBreak && maxRun < 4
console.log(
  notFrozen
    ? 'PASS: countdown kept cycling through Focus/Break, no freeze'
    : `FAIL: countdown looks frozen (sawFocus=${sawFocus}, sawBreak=${sawBreak}, longest run of an identical title=${maxRun})`
)
pass = pass && notFrozen

const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('pomo-stats')).sessions)
// t=0 start; focus completes at t=2,5,8 (3 real focus completions within the
// 10s sampling window); breaks complete at t=3,6,9 and must NOT be logged.
const countOk = sessions.length === 3
console.log(
  `recorded ${sessions.length} session(s) in a 10s auto-start chain (expected exactly 3, one per real focus completion) —`,
  countOk ? 'PASS' : 'FAIL'
)
pass = pass && countOk

console.log('errors:', errors.length ? errors : 'none')
pass = pass && errors.length === 0

await browser.close()
process.exit(pass ? 0 : 1)
