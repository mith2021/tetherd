import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

// Repro: useLocalStorage's functional setState updater applies the update to
// React's in-memory `prev`, not to whatever is currently in localStorage. If
// two tabs of the app are open, each holds its own stale in-memory copy of
// `pomo-stats` from whenever it last mounted/wrote. If tab A finishes a focus
// session and writes it, then tab B — which never re-read localStorage since
// its own mount — finishes a session too, tab B's write silently overwrites
// tab A's, dropping tab A's session entirely. This is exactly the "silently
// dropped" failure mode the tracking-correctness mandate rules out.

const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(CONTAINER_CHROMIUM) ? { executablePath: CONTAINER_CHROMIUM } : {})
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const errors = []

const pageA = await context.newPage()
const pageB = await context.newPage()
pageA.on('pageerror', (e) => errors.push(`[A] ${e}`))
pageB.on('pageerror', (e) => errors.push(`[B] ${e}`))

async function seedQuickTimer(page, secondsLeft) {
  await page.evaluate(
    (secs) =>
      localStorage.setItem(
        'pomo-timer-state-v1',
        JSON.stringify({ sessionType: 'focus', focusCount: 0, secondsLeft: secs, endTime: null })
      ),
    secondsLeft
  )
}

async function readSessions(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('pomo-stats')).sessions)
}

let pass = true

// --- tab A: establish origin, reset shared storage, seed a 2s quick timer ---
await pageA.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await pageA.waitForTimeout(300)
await pageA.evaluate(() => {
  localStorage.setItem('pomo-stats', JSON.stringify({ sessions: [], tasksCompletedByDay: {} }))
  localStorage.removeItem('pomo-stats__backup')
})
await seedQuickTimer(pageA, 2)
await pageA.reload({ waitUntil: 'networkidle' })
await pageA.waitForTimeout(300)

// --- tab B: mounts now, loading the SAME empty pomo-stats into its own React
// memory as tab A had (both stale copies of the same empty array — that's
// fine, nothing to lose yet). Seed its own quick timer before mounting. ---
await seedQuickTimer(pageA, 5) // pageA is same-origin/storage; write before B mounts
await pageB.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await pageB.waitForTimeout(300)

// Give tab A back its own 2s countdown (tab B's mount already captured its
// in-memory secondsLeft=5 at load time, unaffected by this later write since
// there's no cross-tab storage listener).
await seedQuickTimer(pageA, 2)
await pageA.reload({ waitUntil: 'networkidle' })
await pageA.waitForTimeout(300)

// --- run tab A's session to completion first; confirm it lands ---
await pageA.click('button:has-text("Start")')
await pageA.waitForFunction(
  () => document.title.startsWith('Session complete') || document.title === 'Tetherd',
  { timeout: 8000 }
)
await pageA.waitForTimeout(300)
const afterA = await readSessions(pageA)
console.log(`after tab A completes: ${afterA.length} session(s) in pomo-stats`)
const aOk = afterA.length === 1
pass = pass && aOk

// --- now run tab B's session to completion, using its stale in-memory prev ---
await pageB.click('button:has-text("Start")')
await pageB.waitForFunction(
  () => document.title.startsWith('Session complete') || document.title === 'Tetherd',
  { timeout: 8000 }
)
await pageB.waitForTimeout(300)
const afterB = await readSessions(pageB)
console.log(`after tab B completes: ${afterB.length} session(s) in pomo-stats (expected 2 — tab A's + tab B's)`)
const bOk = afterB.length === 2
pass = pass && bOk
if (!bOk) {
  console.log('FAIL: tab B\'s write clobbered tab A\'s session instead of building on the latest persisted state')
}

console.log('errors:', errors.length ? errors : 'none')
pass = pass && errors.length === 0

await browser.close()
process.exit(pass ? 0 : 1)
