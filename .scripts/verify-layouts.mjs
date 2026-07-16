import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

// drag timer widget to customize layout
const handle = await page.$('svg[viewBox="0 0 28 10"]')
const box = await handle.boundingBox()
await page.mouse.move(box.x + 14, box.y + 5)
await page.mouse.down()
for (let i = 1; i <= 15; i++) await page.mouse.move(box.x + 14 - i * 15, box.y + 5 + i * 2)
await page.mouse.up()
await page.waitForTimeout(300)

// Layouts pill should now exist; open it, save a layout
await page.click('button:has-text("Layouts")')
await page.fill('input[placeholder="Layout name"]', 'left side')
await page.press('input[placeholder="Layout name"]', 'Enter')
await page.waitForTimeout(300)
await page.screenshot({ path: process.argv[2] })

// reset layout, then re-apply saved
await page.keyboard.press('Escape')
await page.click('button:has-text("Reset layout")')
await page.waitForTimeout(300)
const afterReset = await page.evaluate(() => localStorage.getItem('pomo-widget-layout-v2'))
console.log('after reset:', afterReset)

await page.click('button:has-text("Layouts")')
await page.click('button:has-text("left side")')
await page.waitForTimeout(300)
const afterApply = await page.evaluate(() => localStorage.getItem('pomo-widget-layout-v2'))
console.log('after apply:', afterApply)
console.log(JSON.parse(afterApply).timer ? 'PASS: saved layout re-applied' : 'FAIL: apply did nothing')
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
