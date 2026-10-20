import { test, expect, type Page } from '@playwright/test';

const origin = 'https://extracurricular.ai';
const preferenceKey = 'exai-analytics-consent-v1';

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

// Serve our local build under the production origin, while mocking Google's
// script. Tests must never send real visitor data to the live GA property.
async function productionSite(page: Page, baseURL: string) {
  const googleRequests: string[] = [];
  await page.route('https://**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) {
      const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    } else {
      googleRequests.push(url.href);
      await route.fulfill({ contentType: 'application/javascript', body: '' });
    }
  });
  return googleRequests;
}

async function pageViews(page: Page) {
  return page.evaluate(() => {
    const layer = (window as Window & { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return layer.map(item => Array.from(item)).filter(item => item[0] === 'event' && item[1] === 'page_view')
      .map(item => item[2] as { page_location: string; page_title: string; page_referrer: string });
  });
}

test('no Google requests before consent or after refusal, including reload', async ({ page, baseURL }) => {
  const requests = await productionSite(page, baseURL!);
  await page.goto(`${origin}/en/`);
  await expect(page.locator('#analytics-consent')).toBeVisible();
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(page.locator('#window-about')).toBeVisible();
  expect(requests).toEqual([]);
  expect(await pageViews(page)).toEqual([]);
  await page.getByRole('button', { name: 'Reject analytics', exact: true }).click();
  await page.reload();
  await expect(page.locator('#analytics-consent')).toBeHidden();
  expect(requests).toEqual([]);
  expect((await page.context().cookies()).filter(cookie => cookie.name.startsWith('_ga'))).toEqual([]);
});

test('consent loads once and tracks content changes without duplicate focus events', async ({ page, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production-only analytics');
  const requests = await productionSite(page, baseURL!);
  await page.goto(`${origin}/en/?private=do-not-send#secret`);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  await expect.poll(async () => (await pageViews(page)).length).toBe(1);
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(page.locator('#window-about')).toHaveClass(/is-active/);
  await page.locator('#window-about .os-titlebar').click();
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  await expect(page.locator('#hero-terminal-input')).toBeEnabled();
  await expect.poll(async () => (await pageViews(page)).length).toBe(2);
  await page.locator('.desktop-icons [data-app-link="blog"]').click();
  await expect(page.locator('#window-blog')).toHaveClass(/is-active/);
  await page.goBack();
  await expect(page.locator('#window-about')).toHaveClass(/is-active/);
  const views = await pageViews(page);
  expect(views.map(view => view.page_location)).toEqual([
    `${origin}/en/`, `${origin}/en/about/`, `${origin}/en/blog/`, `${origin}/en/about/`,
  ]);
  expect(views[1].page_referrer).toBe(`${origin}/en/`);
  expect(views[1].page_title).toMatch(/About/);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain('G-5BMZQENB77');
});

test('withdrawal clears GA cookies and keeps terminal state; saved refusal and re-consent work', async ({ page, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production-only analytics');
  await productionSite(page, baseURL!);
  await page.goto(`${origin}/en/`);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  await page.locator('#hero-terminal-input').fill('echo keep my draft');
  await page.context().addCookies([
    { name: '_ga', value: 'test', domain: '.extracurricular.ai', path: '/' },
    { name: '_ga_5BMZQENB77', value: 'test', url: origin },
  ]);
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Reject analytics', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)['ga-disable-G-5BMZQENB77'])).toBe(true);
  expect((await page.context().cookies()).filter(cookie => cookie.name.startsWith('_ga'))).toEqual([]);
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(page.locator('#window-about')).toBeVisible();
  expect(await pageViews(page)).toHaveLength(1);
  await page.locator('[data-task="terminal"]').click();
  await expect(page.locator('#hero-terminal-input')).toHaveValue('echo keep my draft');
  await page.reload();
  await expect(page.locator('#analytics-consent')).toBeHidden();
  expect(await pageViews(page)).toEqual([]);
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  expect(await pageViews(page)).toHaveLength(1);
});

test('saved opt-in restores and expired preferences prompt again', async ({ page, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production-only analytics');
  await productionSite(page, baseURL!);
  await page.goto(`${origin}/en/`);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await page.reload();
  await expect(page.locator('#analytics-consent')).toBeHidden();
  await expect.poll(async () => (await pageViews(page)).length).toBe(1);
  await page.evaluate(key => {
    localStorage.setItem(key, JSON.stringify({ choice: 'granted', expires: Date.now() - 1 }));
  }, preferenceKey);
  await page.reload();
  await expect(page.locator('#analytics-consent')).toBeVisible();
  expect(await pageViews(page)).toEqual([]);
});

test('local development and preview never load Google even with consent', async ({ page }) => {
  const requests: string[] = [];
  await page.route('https://**/*', async route => {
    requests.push(route.request().url());
    await route.fulfill({ body: '' });
  });
  await page.goto('/zh/');
  await page.getByRole('button', { name: '允许统计', exact: true }).click();
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(page.locator('#window-about')).toBeVisible();
  expect(requests.filter(url => /google/.test(url))).toEqual([]);
  expect(await pageViews(page)).toEqual([]);
});

test('consent remains usable on a narrow screen with storage blocked', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable'); };
  });
  await page.goto('/zh/');
  await expect(page.locator('#analytics-consent')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    return (await (window as any).axe.run(document.querySelector('#analytics-consent'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })).violations;
  });
  expect(violations).toEqual([]);
  await page.getByRole('button', { name: '拒绝统计', exact: true }).click();
  await expect(page.locator('#analytics-consent')).toBeHidden();
  await page.getByRole('button', { name: 'Cookie 设置', exact: true }).click();
  await expect(page.getByRole('button', { name: '拒绝统计', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#analytics-consent')).toBeHidden();
});
