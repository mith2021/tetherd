import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

// Repro: unlike verify-multitab-race.mjs (two tabs, each running its OWN
// session, racing on the pomo-stats write), this covers two tabs sharing the
// SAME live session — e.g. the user opened the app in a second tab while a
// focus session was already running in the first. Both tabs load the same
// `pomo-timer-state-v1` (same endTime) and each runs its own independent
// rAF loop in useTimer.ts's tick(). Neither tab has any way to know the
// other tab already claimed/recorded the completion, so both can
// independently detect `remaining <= 0` and call finishCompletion(),
// double-logging one real session as two.

const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(CONTAINER_CHROMIUM) ? { executablePath: CONTAINER_CHROMIUM } : {})
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const errors = []

const pageA = await context.newPage()
const pageB = await context.newPage()
pageA.on('pageerror', (e) => errors.push(`[A] ${e}`))
pageB.on('pageerror', (e) => errors.push(`[B] ${e}`))

const BASE = 'http://localhost:5173'

async function readSessions(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('pomo-stats')).sessions)
}

let pass = true

// --- tab A: establish origin, reset shared storage ---
await pageA.goto(BASE, { waitUntil: 'networkidle' })
await pageA.waitForTimeout(300)
await pageA.evaluate(() => {
  localStorage.setItem('pomo-stats', JSON.stringify({ sessions: [], tasksCompletedByDay: {} }))
  localStorage.removeItem('pomo-stats__backup')
})

// Seed a single live session ending well in the future, shared by both tabs —
// generous buffer so both tabs' own reload/goto + networkidle wait land well
// before it, and both still observe restoredRunning=true (not
// restoredFinishedElsewhere) when they mount.
const endTime = await pageA.evaluate(() => {
  const endTime = Date.now() + 8000
  localStorage.setItem(
    'pomo-timer-state-v1',
    JSON.stringify({ sessionType: 'focus', focusCount: 0, secondsLeft: 8, endTime })
  )
  return endTime
})

// Reload tab A so useTimer mounts and picks up restoredRunning=true from the
// shared endTime (no click needed — running state is derived from persisted
// endTime being in the future).
await pageA.reload({ waitUntil: 'networkidle' })
console.log(`tab A mounted with ${endTime - Date.now()}ms left on the shared session`)

// Open tab B — same origin/storage, mounts fresh, also sees the same live
// endTime and also starts its own independent countdown to the same target.
await pageB.goto(BASE, { waitUntil: 'networkidle' })
console.log(`tab B mounted with ${endTime - Date.now()}ms left on the shared session`)

console.log(`shared endTime seeded ${endTime - Date.now()}ms from now; waiting for both tabs to complete...`)

await Promise.all([
  pageA.waitForFunction(() => document.title.startsWith('Session complete') || document.title === 'Tetherd', {
    timeout: 8000,
  }),
  pageB.waitForFunction(() => document.title.startsWith('Session complete') || document.title === 'Tetherd', {
    timeout: 8000,
  }),
])
await pageA.waitForTimeout(500)

const sessionsA = await readSessions(pageA)
const sessionsB = await readSessions(pageB)
console.log(`pomo-stats after both tabs settle: ${sessionsA.length} session(s) (read from tab A)`)
console.log(`pomo-stats after both tabs settle: ${sessionsB.length} session(s) (read from tab B)`)

const ok = sessionsA.length === 1 && sessionsB.length === 1
pass = pass && ok
if (!ok) {
  console.log(`FAIL: one real session (same shared endTime, two tabs) got recorded ${sessionsA.length} time(s) instead of exactly 1`)
}

console.log('errors:', errors.length ? errors : 'none')
pass = pass && errors.length === 0

await browser.close()
process.exit(pass ? 0 : 1)
