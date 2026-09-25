import { test, expect } from '@playwright/test'

/**
 * Public-surface smoke tests — no credentials required.
 * Auth-dependent flows live in authenticated.spec.ts and only run when
 * E2E_* credential env vars are set.
 */
test.describe('public pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveTitle(/error/i)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('login portal renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('parent login renders', async ({ page }) => {
    await page.goto('/parent/login')
    await expect(page.locator('input[type="email"], input').first()).toBeVisible()
  })

  test('application form renders', async ({ page }) => {
    await page.goto('/apply')
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('demo request form renders', async ({ page }) => {
    await page.goto('/demo')
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

test.describe('certificate verification', () => {
  test('invalid code reports not found', async ({ page }) => {
    await page.goto('/verify-certificate?code=DEFINITELY-NOT-A-REAL-CODE')
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 })
  })

  test('page renders standalone without a code', async ({ page }) => {
    await page.goto('/verify-certificate')
    await expect(page.getByText('Certificate Verification')).toBeVisible()
  })
})

test.describe('auth guards', () => {
  test('student portal redirects unauthenticated users', async ({ page }) => {
    await page.goto('/student/dashboard')
    await page.waitForLoadState('networkidle')
    // RoleBasedRoute should bounce to /login (or render a login state)
    await expect(page).not.toHaveURL(/\/student\/dashboard$/)
  })

  test('parent portal redirects to parent login', async ({ page }) => {
    await page.goto('/parent/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/parent\/login|login/)
  })

  test('tenant admin area is protected', async ({ page }) => {
    await page.goto('/tenant/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/tenant\/dashboard$/)
  })
})
