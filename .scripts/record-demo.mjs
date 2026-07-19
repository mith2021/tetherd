import { chromium } from 'playwright'
import fs from 'node:fs'

const url = process.argv[2] || 'http://localhost:5173'
const outDir = process.argv[3] || 'docs/frames'

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 625 } })

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

let frame = 0
async function shot() {
  await page.screenshot({ path: `${outDir}/${String(frame).padStart(3, '0')}.png` })
  frame++
}

await shot()
await shot()

await page.click('body')
await page.keyboard.press('Space') // start timer
await page.waitForTimeout(400)
await shot()
await shot()

const widget = page.locator('[class*="cursor-grab"]').first()
const box = await widget.boundingBox()
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + 10)
  await page.mouse.down()
  const steps = 10
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(box.x + 200 * (i / steps), box.y + 60 * (i / steps), { steps: 1 })
    await shot()
  }
  await page.mouse.up()
}
await shot()
await page.waitForTimeout(300)
await shot()

await page.keyboard.press('Space') // pause
await shot()
await shot()

await browser.close()
console.log('Frames saved to', outDir, '-', frame, 'frames')
