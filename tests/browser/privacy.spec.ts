import { test, expect } from '@playwright/test';

test('privacy notice opens without replacing the desktop or loading an ad', async ({ page }) => {
  await page.goto('/zh/');
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  await page.locator('#hero-terminal-input').fill('echo privacy draft');
  await page.locator('[data-privacy-link]').click();
  await expect(page).toHaveURL(/\/zh\/privacy\/$/);
  await expect(page.locator('#window-article h1')).toHaveText('隐私与 Cookie');
  await expect(page.locator('#window-terminal')).toBeVisible();
  await expect(page.locator('[data-article-ad]')).toHaveCount(0);
  await page.getByRole('button', { name: '拒绝统计', exact: true }).click();
  await page.locator('[data-task="terminal"]').click();
  await expect(page.locator('#hero-terminal-input')).toHaveValue('echo privacy draft');
});

test('public privacy URL is readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/en/privacy/');
  await expect(page.locator('h1')).toHaveText('Privacy & cookies');
  await expect(page.locator('.privacy-content')).toContainText('Google advertising');
  await expect(page.locator('a[href="https://myadcenter.google.com/"]')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://extracurricular.ai/en/privacy/');
  await context.close();
});
