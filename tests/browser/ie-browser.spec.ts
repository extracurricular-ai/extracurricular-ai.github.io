import { test, expect, type Page } from '@playwright/test';
const axePath = require.resolve('axe-core/axe.min.js');
const origin = 'https://browser-fixture.example';

async function openBrowser(page: Page, locale = 'zh') {
  await page.goto(`/${locale}/`);
  await page.locator('.desktop-icons [data-open="browser"]').click();
  await expect(page.locator('#window-browser')).toBeVisible();
}
async function navigate(page: Page, value: string) {
  await page.locator('#ie-address').fill(value);
  await page.locator('#ie-address').press('Enter');
}
async function fixture(page: Page) {
  await page.route(`${origin}/**`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><head><title>External fixture</title></head><body><h1>${new URL(route.request().url()).pathname}</h1><a href="/inside">Internal link</a><script>try{parent.document.body;document.body.dataset.parent='allowed'}catch{document.body.dataset.parent='blocked'}</script></body></html>` }));
}

for (const locale of ['zh', 'en', 'es', 'fr']) {
  test(`${locale}: IE home and toolbar are accessible and do not preload external websites`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.isNavigationRequest() && request.frame().parentFrame()) requests.push(request.url()); });
    await openBrowser(page, locale);
    await expect(page.locator('[data-browser-home]')).toBeVisible();
    await expect(page.locator('[data-browser-frame] iframe')).toHaveCount(0);
    expect(requests).toEqual([]);
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations);
    expect(violations).toEqual([]);
    await page.locator('[data-browser-action="favorites"]').click();
    await expect(page.locator('#ie-favorites')).toBeVisible();
    await page.locator('#window-browser [data-window-action="close"]').click();
    await expect(page.locator('.desktop-icons [data-open="browser"]')).toBeFocused();
  });
}

test('IE loads interactive external documents, navigates address history and refreshes', async ({ page }) => {
  await fixture(page);
  let requests = 0;
  page.on('request', request => { if (request.url().startsWith(origin)) requests++; });
  await openBrowser(page);
  await navigate(page, `${origin}/one`);
  const frame = page.frameLocator('[data-browser-frame] iframe');
  await expect(frame.locator('h1')).toHaveText('/one');
  await expect(frame.locator('body')).toHaveAttribute('data-parent', 'blocked');
  await frame.locator('a').click();
  await expect(frame.locator('h1')).toHaveText('/inside');
  await expect(page.locator('#ie-address')).toHaveValue(`${origin}/one`);
  await page.locator('[data-browser-action="refresh"]').click();
  await expect(frame.locator('h1')).toHaveText('/one');
  await navigate(page, `${origin}/two`);
  await expect(frame.locator('h1')).toHaveText('/two');
  await page.locator('[data-browser-action="back"]').click();
  await expect(frame.locator('h1')).toHaveText('/one');
  await page.locator('[data-browser-action="forward"]').click();
  await expect(frame.locator('h1')).toHaveText('/two');
  await page.locator('[data-browser-action="back"]').click();
  await navigate(page, `${origin}/three`);
  await expect(frame.locator('h1')).toHaveText('/three');
  await expect(page.locator('[data-browser-action="forward"]')).toBeDisabled();
  const previousRequests = requests;
  await page.locator('#window-browser [data-window-action="minimize"]').click();
  await page.locator('[data-task="browser"]').click();
  await expect(frame.locator('h1')).toHaveText('/three');
  expect(requests).toEqual(previousRequests);
  await page.locator('#window-browser [data-window-action="close"]').click();
  await expect(page.locator('[data-browser-frame] iframe')).toHaveCount(0);
  await page.locator('.desktop-icons [data-open="browser"]').click();
  await expect(frame.locator('h1')).toHaveText('/three');
  expect(requests).toEqual(previousRequests + 1);
  await page.locator('[data-browser-action="home"]').click();
  await expect(page.locator('[data-browser-home]')).toBeVisible();
  await expect(page.locator('[data-browser-frame] iframe')).toHaveCount(0);
});

test('IE rejects executable URLs and keeps an honest fallback for blocked frames', async ({ page }) => {
  await page.context().route(`${origin}/blocked`, route => route.fulfill({ headers: { 'Content-Security-Policy': "frame-ancestors 'none'" }, contentType: 'text/html', body: '<h1>Cannot embed</h1>' }));
  await openBrowser(page);
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'http://example.com', 'https://user:pass@example.com']) {
    await navigate(page, url);
    await expect(page.locator('#ie-address-error')).toBeVisible();
    await expect(page.locator('#ie-address')).toBeFocused();
    await expect(page.locator('[data-browser-frame] iframe')).toHaveCount(0);
  }
  await navigate(page, `${origin}/blocked`);
  await expect(page.locator('#ie-address-error')).toBeHidden();
  const link = page.locator('[data-browser-external-link]');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', `${origin}/blocked`);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(page.locator('[data-browser-status]')).not.toContainText('成功');
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await expect(popup.locator('h1')).toHaveText('Cannot embed');
});

test('IE maximizes to fill the window and reflows on mobile with keyboard access to the frame', async ({ page }) => {
  await fixture(page);
  await openBrowser(page);
  await navigate(page, `${origin}/one`);
  await expect(page.frameLocator('[data-browser-frame] iframe').locator('h1')).toBeVisible();
  await page.locator('#window-browser [data-window-action="maximize"]').click();
  const bounds = await page.locator('[data-browser-frame] iframe').boundingBox();
  expect(bounds!.height).toBeGreaterThan(500);
  const gap = await page.locator('#window-browser').evaluate(el => el.querySelector('.os-window-body')!.getBoundingClientRect().bottom - el.querySelector('[data-browser-status]')!.getBoundingClientRect().bottom);
  expect(gap).toBeLessThanOrEqual(3);
  await page.locator('[data-browser-action="enter"]').click();
  await expect(page.locator('[data-browser-frame] iframe')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('.ie-return [data-browser-action="address"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ie-address')).toBeFocused();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('[data-browser-external-link]')).toBeVisible();
});
