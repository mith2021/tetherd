import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// start timer, wait 3s, pause — countdown must NOT reset to 25:00
await page.click('button:has-text("Start")')
await page.waitForTimeout(3200)
const beforePause = await page.evaluate(() => document.title)
await page.click('button:has-text("Pause")')
await page.waitForTimeout(500)
const timerText = await page.textContent('.tabular-nums')
console.log('title while running:', beforePause)
console.log('displayed time after pause:', timerText)
console.log(timerText === '25:00' ? 'FAIL: pause reset the timer' : 'PASS: pause kept remaining time')

// resume — should continue from where it left off
await page.click('button:has-text("Start")')
await page.waitForTimeout(1200)
const afterResume = await page.evaluate(() => document.title)
console.log('title after resume:', afterResume)

await page.screenshot({ path: process.argv[2] })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
