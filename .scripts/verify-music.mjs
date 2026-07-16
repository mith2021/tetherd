import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)

await page.click('button[title="Music / ambient sound"]')
await page.fill('input[placeholder*="youtube"]', 'https://www.youtube.com/watch?v=YAS4ojuhbW4&list=PLAFr4aN80Y_lJ25ilGQwDzzlcBw4FkXRT&index=40')
await page.click('button:has-text("Play")')
await page.waitForTimeout(1500)

const iframeSrcOpen = await page.getAttribute('iframe[title="Ambient sound player"]', 'src')
console.log('iframe src:', iframeSrcOpen)

await page.keyboard.press('Escape')
await page.click('body', { position: { x: 400, y: 400 } })
await page.waitForTimeout(800)

const iframeStillThere = await page.$('iframe[title="Ambient sound player"]')
console.log(iframeStillThere ? 'PASS: player survives popover close' : 'FAIL: player unmounted on close')

await page.screenshot({ path: process.argv[2] })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
