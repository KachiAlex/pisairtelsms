import { test, expect } from '@playwright/test'

/**
 * Authenticated E2E — only runs when credentials are provided:
 *   E2E_STUDENT_ADMISSION, E2E_STUDENT_PASSWORD
 *   E2E_PARENT_EMAIL, E2E_PARENT_PASSWORD
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 * (plus E2E_BASE_URL for the target deployment)
 */
const studentCreds = process.env.E2E_STUDENT_ADMISSION && process.env.E2E_STUDENT_PASSWORD
const parentCreds = process.env.E2E_PARENT_EMAIL && process.env.E2E_PARENT_PASSWORD
const adminCreds = process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD

test.describe('authenticated flows', () => {
  test.skip(!studentCreds, 'E2E_STUDENT_* env vars not set')
  test.skip(!parentCreds && !adminCreds, 'placeholder')

  test('student login reaches the portal', async ({ page }) => {
    test.skip(!studentCreds, 'E2E_STUDENT_* env vars not set')
    await page.goto('/login')
    // AccessPortalPage — fill admission number + password for a student account
    await page.locator('input').first().fill(process.env.E2E_STUDENT_ADMISSION!)
    await page.locator('input[type="password"]').first().fill(process.env.E2E_STUDENT_PASSWORD!)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click()
    await page.waitForURL(/student/, { timeout: 15000 })
    await expect(page.locator('body')).not.toContainText(/something went wrong/i)
  })

  test('parent login reaches the dashboard', async ({ page }) => {
    test.skip(!parentCreds, 'E2E_PARENT_* env vars not set')
    await page.goto('/parent/login')
    await page.locator('input[type="email"], input[name="email"]').first().fill(process.env.E2E_PARENT_EMAIL!)
    await page.locator('input[type="password"]').first().fill(process.env.E2E_PARENT_PASSWORD!)
    await page.getByRole('button', { name: /sign in|log in/i }).first().click()
    await page.waitForURL(/parent/, { timeout: 15000 })
    await expect(page.getByText(/dashboard|children|welcome/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('admin login reaches tenant portal', async ({ page }) => {
    test.skip(!adminCreds, 'E2E_ADMIN_* env vars not set')
    await page.goto('/login')
    await page.locator('input[type="email"], input[name="email"], input').first().fill(process.env.E2E_ADMIN_EMAIL!)
    await page.locator('input[type="password"]').first().fill(process.env.E2E_ADMIN_PASSWORD!)
    await page.getByRole('button', { name: /sign in|log in/i }).first().click()
    await page.waitForURL(/tenant/, { timeout: 15000 })
  })
})
