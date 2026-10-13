import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const yearly = (page: Page) => page.getByRole('radio', { name: /Yearly/ })
const monthly = (page: Page) => page.getByRole('radio', { name: /Monthly/ })
const cta = (page: Page) => page.getByRole('button', { name: 'Continue' })
const restore = (page: Page) => page.getByRole('button', { name: 'Restore purchases' })

test.describe('paywall', () => {
  test('shows both plans with yearly pre-selected', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Unlock all games' })).toBeVisible()
    await expect(yearly(page)).toHaveAttribute('aria-checked', 'true')
    await expect(monthly(page)).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByText('Save 50%')).toBeVisible()
  })

  test('selecting a plan moves the checked state', async ({ page }) => {
    await page.goto('/')
    await monthly(page).click()
    await expect(monthly(page)).toHaveAttribute('aria-checked', 'true')
    await expect(yearly(page)).toHaveAttribute('aria-checked', 'false')
  })

  test('plans can be chosen with the keyboard', async ({ page }) => {
    await page.goto('/')
    await monthly(page).focus()
    await page.keyboard.press('Space')
    await expect(monthly(page)).toHaveAttribute('aria-checked', 'true')
  })

  test('buying a plan shows the success screen', async ({ page }) => {
    await page.goto('/')
    await monthly(page).click()
    await cta(page).click()

    await expect(page.getByText('Purchase complete')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'You\'re all set!' })).toBeFocused()
    await expect(page.getByText('$4.99 / month')).toBeVisible()
    await expect(page.getByText(/^#PW-[0-9A-F]{6}$/)).toBeVisible()
  })

  test('a double tap sends a single purchase request', async ({ page }) => {
    let requests = 0
    await page.route('**/api/purchase', async (route) => {
      requests++
      await new Promise(r => setTimeout(r, 300))
      await route.continue()
    })
    await page.goto('/')
    await cta(page).dblclick()
    await expect(page.getByText('Purchase complete')).toBeVisible()
    expect(requests).toBe(1)
  })

  test('retries a dropped purchase request with the same Idempotency-Key', async ({ page }) => {
    const keys: string[] = []
    await page.route('**/api/purchase', async (route) => {
      keys.push(route.request().headers()['idempotency-key'] ?? '')
      // First attempt "loses" the response, the automatic retry goes through.
      if (keys.length === 1) return route.fulfill({ status: 503, body: '{}' })
      return route.continue()
    })
    await page.goto('/')
    await cta(page).click()

    await expect(page.getByText('Purchase complete')).toBeVisible()
    expect(keys).toHaveLength(2)
    expect(keys[0]).toMatch(/^[\w-]{8,}$/)
    expect(keys[1]).toBe(keys[0])
  })

  test('shows a spinner while the purchase is in flight', async ({ page }) => {
    await page.route('**/api/purchase', async (route) => {
      await new Promise(r => setTimeout(r, 800))
      await route.continue()
    })
    await page.goto('/')
    await cta(page).click()
    await expect(page.getByRole('button', { name: 'Processing' })).toBeDisabled()
    await expect(page.getByText('Purchase complete')).toBeVisible()
  })

  test('a failed purchase keeps the paywall and explains what happened', async ({ page }) => {
    await page.route('**/api/purchase', route => route.fulfill({ status: 500, body: '{}' }))
    await page.goto('/')
    await cta(page).click()
    await expect(page.getByText('Purchase failed. Please try again.')).toBeVisible()
    await expect(cta(page)).toBeEnabled()
  })
})

test.describe('loading and errors', () => {
  test('shows skeletons while plans are loading', async ({ page }) => {
    await page.route(/\/api\/offers/, async (route) => {
      await new Promise(r => setTimeout(r, 800))
      await route.continue()
    })
    await page.goto('/')
    await expect(page.locator('.skeleton')).toHaveCount(2)
    await expect(cta(page)).toBeDisabled()
    await expect(yearly(page)).toBeVisible()
  })

  test('recovers from a failed plans request with "Try again"', async ({ page }) => {
    // useFetch silently retries a 5xx once, so keep failing until the "network" is back.
    let networkDown = true
    await page.route(/\/api\/offers/, route =>
      networkDown ? route.fulfill({ status: 503, body: '{}' }) : route.continue())
    await page.goto('/')

    await expect(page.getByRole('alert')).toContainText('Couldn\'t load plans')
    await expect(cta(page)).toBeDisabled()
    networkDown = false
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(yearly(page)).toBeVisible()
    await expect(cta(page)).toBeEnabled()
  })
})

test.describe('restore purchases', () => {
  test('tells a new device that nothing was found', async ({ page }) => {
    await page.goto('/')
    await restore(page).click()
    await expect(page.getByText('No purchases found on this device.')).toBeVisible()
  })

  test('restores a purchase made earlier on the same device', async ({ page }) => {
    await page.goto('/')
    await cta(page).click()
    await expect(page.getByText('Purchase complete')).toBeVisible()

    await page.reload()
    await restore(page).click()
    await expect(page.getByText('Purchase complete')).toBeVisible()
    await expect(page.getByText('$29.99 / year')).toBeVisible()
  })
})

test.describe('layout and accessibility', () => {
  for (const width of [360, 390, 430]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      await expect(yearly(page)).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBe(0)
    })
  }

  test('tap targets are at least 44px tall', async ({ page }) => {
    await page.goto('/')
    await expect(yearly(page)).toBeVisible()
    for (const target of [yearly(page), monthly(page), cta(page), restore(page), page.getByRole('button', { name: 'Close' })]) {
      const box = await target.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('paywall has no serious accessibility violations', async ({ page }) => {
    await page.goto('/')
    await expect(yearly(page)).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  })

  test('success screen has no serious accessibility violations', async ({ page }) => {
    await page.goto('/')
    await cta(page).click()
    await expect(page.getByText('Purchase complete')).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  })
})
