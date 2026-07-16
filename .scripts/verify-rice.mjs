import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

// open settings -> appearance
const buttons = await page.$$('header button')
await buttons[buttons.length - 1].click()
await page.click('button:has-text("Appearance")')
await page.waitForTimeout(400)
await page.screenshot({ path: process.argv[2] + '/rice-1-appearance.png' })

// pick Doto font
const fontButtons = await page.$$('[role="dialog"] button:has-text("25:00")')
console.log('font options:', fontButtons.length)
await fontButtons[4].click()
await page.waitForTimeout(300)

// toggle off task list
const dialog = await page.$('[role="dialog"]')
const switches = await dialog.$$('[role="switch"]')
console.log('switches:', switches.length)
await switches[0].click() // task list off
await page.waitForTimeout(300)

await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await page.screenshot({ path: process.argv[2] + '/rice-2-doto-notasks.png' })

const taskInput = await page.$('input[placeholder*="working on"]')
console.log(taskInput ? 'FAIL: task list still visible' : 'PASS: task list hidden')
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
