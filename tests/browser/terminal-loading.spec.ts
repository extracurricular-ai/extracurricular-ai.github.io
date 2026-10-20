import { test, expect } from '@playwright/test';

for (const locale of ['en', 'zh', 'es', 'fr']) {
  test(`${locale}: JSON endpoints and terminal commands work without hydration errors`, async ({ page, request }) => {
    for (const endpoint of ['terminal', 'search']) {
      const response = await request.get(`/${locale}/${endpoint}.json`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
      expect(Array.isArray(await response.json())).toBe(true);
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /hydrati|Expected a DOM node/i.test(message.text())) errors.push(message.text());
    });
    await page.goto(`/${locale}/`);
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === `/${locale}/terminal.json`);
    await page.locator('.desktop-icons [data-open="terminal"]').click();
    expect((await loaded).status()).toBe(200);
    const input = page.locator('#hero-terminal-input');
    await expect(input).toBeEnabled();
    await input.fill('pwd');
    await input.press('Enter');
    await expect(page.locator('.terminal-text').last()).toContainText('/home/visitor');
    await input.fill('cat /README.md');
    await input.press('Enter');
    await expect(page.locator('.terminal-text').last()).toContainText('Extracurricular AI');
    await input.fill('play invaders');
    await input.press('Enter');
    await expect(page.locator('.arcade')).toBeVisible();
    await page.locator('.arcade').press('Escape');
    await expect(input).toBeFocused();
    expect(errors).toEqual([]);
  });
}
