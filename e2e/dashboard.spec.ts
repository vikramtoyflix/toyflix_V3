// TEST_PLAN: §4 Dashboard – unauthenticated behaviour
import { test, expect } from '@playwright/test';

test.describe('Dashboard (TEST_PLAN: D1 unauthenticated)', () => {
  test('D1: Unauthenticated user sees auth redirect or login prompt', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasAuth = url.includes('/auth') || url.includes('/login');
    const hasDashboardError = await page.getByText(/Dashboard Error|Session expired|Sign in|Login/i).first().isVisible().catch(() => false);
    expect(hasAuth || hasDashboardError).toBeTruthy();
  });
});
