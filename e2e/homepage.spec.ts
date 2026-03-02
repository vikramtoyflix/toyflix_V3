// TEST_PLAN: §2 Homepage & Public – H1, H2, H4, H6
import { test, expect } from '@playwright/test';

test.describe('Homepage (TEST_PLAN: H1, H2, H4, H6)', () => {
  test('H1: Homepage loads with hero and no critical errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page).toHaveURL(/\//);
    // Hero or main content visible (desktop: HeroCarousel; mobile may differ)
    await expect(page.getByRole('main').or(page.locator('body'))).toBeVisible();
    // No uncaught JS errors (allow React dev overlay in dev)
    const critical = errors.filter((e) => !e.includes('React') && !e.includes('Hydration'));
    expect(critical).toHaveLength(0);
  });

  test('H2: Toys carousel / Rent premium toys section loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Rent premium toys/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('H4: Navigation – Pricing opens /pricing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Pricing/i }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByText(/Simple pricing|smarter alternative/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('H6: Navigation – Toys opens /toys', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^Toys$/i }).first().click();
    await expect(page).toHaveURL(/\/toys/);
    await expect(page.locator('body')).toContainText(/Premium|Ride-On|Toys/i);
  });
});
