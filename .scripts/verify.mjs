import { chromium } from 'playwright'
import path from 'node:path'

const outDir = process.argv[2]
const url = 'http://localhost:5173'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

async function shot(name) {
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(outDir, `${name}.png`) })
  console.log('shot:', name)
}

await page.goto(url, { waitUntil: 'networkidle' })
await shot('01-initial')

// settings dialog
await page.click('button[title=""], header button:has(svg circle[r="3"])').catch(async () => {
  // fallback: click the gear button by its position (last button in header right group)
  const buttons = await page.$$('header button')
  await buttons[buttons.length - 1].click()
})
await shot('02-settings-open')
await page.keyboard.press('Escape')

// stats popover
await page.click('header button:has-text("focus session")')
await shot('03-stats-popover')
await page.keyboard.press('Escape')

// task add + checkbox + remove
const taskInput = await page.$('input[placeholder*="working on"]')
if (taskInput) {
  await taskInput.fill('Test task from verify script')
  await taskInput.press('Enter')
  await shot('04-task-added')

  const checkbox = await page.$('[role="checkbox"]')
  if (checkbox) {
    await checkbox.click()
    await shot('05-task-checked')
  }
}

// drag timer widget
const dragHandle = await page.$('svg[viewBox="0 0 28 10"]')
if (dragHandle) {
  const box = await dragHandle.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 100, { steps: 10 })
    await page.mouse.up()
    await shot('06-timer-dragged')
  }
}

// resize handle on task widget (hover to reveal, then drag)
const taskWidget = await page.$$('.glass')
console.log('glass panels found:', taskWidget.length)

await shot('07-final-state')

console.log('Console errors:', errors.length ? errors : 'none')
await browser.close()
