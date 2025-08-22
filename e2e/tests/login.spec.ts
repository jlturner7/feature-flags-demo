import { test, expect } from '@playwright/test';

test('login navigates to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('user').fill('demo');
  await page.getByPlaceholder('pass').fill('demo');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

