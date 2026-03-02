// TEST_PLAN: §1 Auth – smoke only (no real OTP)
import { test, expect } from '@playwright/test';

test.describe('Auth page (TEST_PLAN: A1 smoke)', () => {
  test('A1 smoke: Auth page loads with phone input', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth/);
    const phoneInput = page.getByPlaceholder(/phone|number|mobile/i).or(
      page.getByRole('textbox', { name: /phone|number/i })
    ).first();
    await expect(phoneInput).toBeVisible({ timeout: 10000 });
  });
});
