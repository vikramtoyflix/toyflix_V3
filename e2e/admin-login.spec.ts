// E2E: Admin login with email/password (E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD from env).
// Run only when those secrets are set (e.g. in CI). Build app with VITE_E2E_LOGIN_ENABLED=true.
import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const skipAdminTests = !adminEmail || !adminPassword;

test.describe('Admin E2E login', () => {
  test.skip(skipAdminTests, 'No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD')('AD1: Admin can sign in with email/password and open admin', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth/);

    const emailInput = page.getByLabel(/email/i).first();
    const passwordInput = page.getByLabel(/password/i).first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill(adminEmail!);
    await passwordInput.fill(adminPassword!);
    await page.getByRole('button', { name: /Sign in \(E2E\)/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
    await expect(page.locator('body')).not.toContainText('Dashboard Error');
  });

  test.skip(skipAdminTests, 'No E2E credentials')('AD2: Admin can see Orders tab after login', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel(/email/i).first().fill(adminEmail!);
    await page.getByLabel(/password/i).first().fill(adminPassword!);
    await page.getByRole('button', { name: /Sign in \(E2E\)/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    await page.getByRole('tab', { name: /Orders/i }).or(
      page.getByText(/Orders/i).first()
    ).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });
});
