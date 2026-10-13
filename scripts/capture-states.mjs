// Captures every paywall state at 390x844 @1x (same as the Figma exports).
// Usage: node scripts/capture-states.mjs [baseUrl=http://localhost:3000] [outDir=.screens]
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const [base = 'http://localhost:3000', outDir = '.screens'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
// Fresh context per state so localStorage / deviceId don't leak between them.
async function shot(name, path, act) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(base + path)
  await page.addStyleTag({ content: '#nuxt-devtools-container, nuxt-devtools-frame { display: none !important; }' })
  await act(page)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${outDir}/${name}.png` })
  await ctx.close()
  console.log('saved', `${outDir}/${name}.png`)
}

const offersReady = page => page.getByRole('radio').first().waitFor()

await shot('Default', '/', offersReady)
await shot('Loading', '/?simulate=slow', page => page.locator('.skeleton').first().waitFor())
await shot('Error', '/?simulate=error', page => page.getByRole('alert').waitFor())
await shot('Purchasing', '/?simulate=slow', async (page) => {
  await offersReady(page)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByText('Processing').waitFor()
})
await shot('Success', '/', async (page) => {
  await offersReady(page)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByText('Purchase complete').waitFor()
})

await browser.close()
