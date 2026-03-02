// TEST_PLAN: §6 Pricing – P1
import { test, expect } from '@playwright/test';

test.describe('Pricing Page (TEST_PLAN: P1)', () => {
  test('P1: Pricing page loads with plans and CTA', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByText(/Simple pricing|smarter alternative|A smarter alternative/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Get 3 toys|subscription|plan/i).first()).toBeVisible({ timeout: 5000 });
  });
});
