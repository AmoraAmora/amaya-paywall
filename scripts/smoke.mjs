// End-to-end smoke test of the paywall flows against a running server.
// Usage: node scripts/smoke.mjs [baseUrl=http://localhost:3000]
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:3000'
const browser = await chromium.launch()
const newPage = async (path = '/', viewport = { width: 390, height: 844 }) => {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  await page.goto(base + path)
  await page.getByRole('radio').first().waitFor()
  return page
}
const step = (name) => console.log('✓', name)

// 1. Yearly is pre-selected, selecting Monthly moves the checked state
{
  const page = await newPage()
  const [yearly, monthly] = await page.getByRole('radio').all()
  assert.equal(await yearly.getAttribute('aria-checked'), 'true')
  await monthly.click()
  assert.equal(await monthly.getAttribute('aria-checked'), 'true')
  assert.equal(await yearly.getAttribute('aria-checked'), 'false')
  step('offer selection')

  // 2. Restore with no purchases shows an info notice
  await page.getByRole('button', { name: 'Restore purchases' }).click()
  await page.getByText('No purchases found on this device.').waitFor()
  step('restore without purchases')

  // 3. Buy Monthly → success screen shows the monthly plan
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByText('Purchase complete').waitFor()
  assert.ok(await page.getByText('$4.99 / month').isVisible())
  step('purchase monthly → success')

  // 4. Reload (same device) → Restore finds the purchase
  await page.reload()
  await page.getByRole('radio').first().waitFor()
  await page.getByRole('button', { name: 'Restore purchases' }).click()
  await page.getByText('Purchase complete').waitFor()
  step('restore after reload')
  await page.context().close()
}

// 5. Purchase failure keeps the paywall and shows an error
{
  const page = await newPage('/?simulate=purchase-error')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByText('Purchase failed. Please try again.').waitFor()
  assert.ok(await page.getByRole('button', { name: 'Continue' }).isEnabled())
  step('purchase error')
  await page.context().close()
}

// 6. No horizontal scroll at the edges of the target range
for (const width of [360, 430]) {
  const page = await newPage('/', { width, height: 780 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.equal(overflow, 0, `horizontal overflow at ${width}px`)
  await page.screenshot({ path: `.screens/width-${width}.png`, fullPage: true })
  step(`no horizontal overflow at ${width}px`)
  await page.context().close()
}

await browser.close()
console.log('all smoke checks passed')
