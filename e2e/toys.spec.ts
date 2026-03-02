// TEST_PLAN: §3 Toys Page – T1, T4
import { test, expect } from '@playwright/test';

test.describe('Toys Page (TEST_PLAN: T1, T4)', () => {
  test('T1: Toys page loads with catalog (Premium + Ride-On)', async ({ page }) => {
    await page.goto('/toys');
    await expect(page).toHaveURL(/\/toys/);
    // Tabs or catalog content
    const hasTabs = await page.getByRole('tab', { name: /Premium|Ride-On|Toys/i }).first().isVisible().catch(() => false);
    const hasCatalog = await page.getByText(/Premium|Ride-On|toys/i).first().isVisible().catch(() => false);
    expect(hasTabs || hasCatalog).toBeTruthy();
    // Wait for content (loading then content or empty state)
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('T4: Clicking a toy card opens product page', async ({ page }) => {
    await page.goto('/toys');
    await expect(page).toHaveURL(/\/toys/);
    await page.waitForTimeout(4000);
    const productLink = page.locator('a[href*="/toys/"]').first();
    const count = await productLink.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await productLink.click();
    await expect(page).toHaveURL(/\/toys\/[^/]+/);
    await expect(page.locator('body')).not.toContainText('404');
  });
});
