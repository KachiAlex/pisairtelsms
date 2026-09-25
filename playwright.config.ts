import { defineConfig } from '@playwright/test'

/**
 * E2E tests run against a deployed instance by default.
 *   E2E_BASE_URL=https://pisairtelsms.com npx playwright test
 * For local runs, start `npm run dev` + the API server and omit E2E_BASE_URL.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
