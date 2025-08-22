import { test, expect } from '@playwright/test';

test('toggle plugin status reflects in UI', async ({ page }) => {
  await page.goto('/dashboard'); // no real auth; simple demo
  const status = page.locator('#status');
  const before = await status.textContent();
  await page.getByRole('button', { name: 'Toggle' }).click();
  await expect(status).not.toHaveText(before!);
});

