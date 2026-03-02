// TEST_PLAN: §2 H5 – About page
import { test, expect } from '@playwright/test';

test.describe('About (TEST_PLAN: H5)', () => {
  test('H5: About page loads', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /About/i }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });
});
