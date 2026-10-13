import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The API suite builds and boots the real Nuxt server once.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
})
