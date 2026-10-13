import { defineConfig, devices } from '@playwright/test'

// E2E_BASE_URL=https://… runs the suite against a deployed site instead of a local build.
const externalBaseURL = process.env.E2E_BASE_URL
const PORT = 3100

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      // Same size as the Figma frame: 390×844.
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run build && node .output/server/index.mjs',
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // In-memory purchases: E2E runs never write to the real database.
        env: { PORT: String(PORT), PURCHASE_STORAGE: 'memory', DATABASE_URL: '' },
      },
})
