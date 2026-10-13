// Usage: node scripts/screenshot.mjs <url> <out.png> [width=390] [height=844]
import { chromium } from 'playwright'

const [url, out, w = '390', h = '844'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: out })
await browser.close()
console.log('saved', out)
