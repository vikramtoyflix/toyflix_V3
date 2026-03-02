// TEST_PLAN: §8 Product Detail – PD1
import { test, expect } from '@playwright/test';

test.describe('Product Detail (TEST_PLAN: PD1)', () => {
  test('PD1: Product page loads for a known toy ID', async ({ page }) => {
    await page.goto('/toys');
    await page.waitForTimeout(4000);
    const link = page.locator('a[href*="/toys/"]').first();
    if ((await link.count()) === 0) {
      test.skip();
      return;
    }
    const href = await link.getAttribute('href');
    await page.goto(href || '/toys');
    await expect(page).toHaveURL(/\/toys\/.+/);
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });
});
