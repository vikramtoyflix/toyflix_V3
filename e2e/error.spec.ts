// TEST_PLAN: §9 Error Handling – E4
import { test, expect } from '@playwright/test';

test.describe('Error Handling (TEST_PLAN: E4)', () => {
  test('E4: 404 page for nonexistent route', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await expect(page.getByText('404').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Page not found|Oops/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to Home|Home/i }).first()).toBeVisible();
  });
});
