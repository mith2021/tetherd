import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const url = process.argv[2] || 'http://localhost:5173'
const outDir = process.argv[3] || 'docs/video-tmp'

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ],
})
const context = await browser.newContext({
  viewport: { width: 1000, height: 625 },
  recordVideo: { dir: outDir, size: { width: 1000, height: 625 } },
  permissions: ['camera'],
})
const page = await context.newPage()

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// start a focus session
await page.click('body')
await page.keyboard.press('Space')
await page.waitForTimeout(1500)

// open settings, enable webcam presence
await page.click('button:has(svg circle[cx="12"][cy="12"][r="3"])')
await page.waitForTimeout(600)

const webcamSwitch = page.locator('text=Webcam presence detection').locator('..').locator('button[role="switch"]')
if (await webcamSwitch.count()) {
  await webcamSwitch.click()
  await page.waitForTimeout(1200)
}

// appearance tab: backgrounds + accent + font
await page.click('text=Appearance')
await page.waitForTimeout(500)

const bgThumbs = page.locator('button.aspect-video')
const bgCount = await bgThumbs.count()
for (let i = 0; i < Math.min(bgCount, 4); i++) {
  await bgThumbs.nth(i).click()
  await page.waitForTimeout(700)
}

const fontButtons = page.locator('button[style*="font-family"]')
const fontCount = await fontButtons.count()
for (let i = 0; i < Math.min(fontCount, 3); i++) {
  await fontButtons.nth(i).click()
  await page.waitForTimeout(500)
}

await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// drag a widget around
const widget = page.locator('[class*="cursor-grab"]').first()
const box = await widget.boundingBox()
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + 10)
  await page.mouse.down()
  const steps = 24
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      box.x + 220 * Math.sin(i / 4),
      box.y + 10 + 100 * (i / steps),
      { steps: 3 },
    )
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}
await page.waitForTimeout(800)

await page.keyboard.press('Space') // pause
await page.waitForTimeout(1000)

await context.close()
await browser.close()

const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.webm'))
const videoPath = path.join(outDir, files[0])
console.log('Video saved to', videoPath)
