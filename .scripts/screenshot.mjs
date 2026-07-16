import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'
const outPath = process.argv[3] || 'screenshot.png'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: outPath })

console.log('Screenshot saved:', outPath)
if (errors.length) {
  console.log('Console errors:')
  errors.forEach((e) => console.log(' -', e))
} else {
  console.log('No console errors.')
}

await browser.close()
