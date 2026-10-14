import { test, expect, type Page } from '@playwright/test';
const axePath = require.resolve('axe-core/axe.min.js');
async function open(page: Page, locale = 'zh') {
  await page.goto(`/${locale}/`);
  await page.locator('.desktop-icons [data-open="browser"]').click();
}
async function search(page: Page, query: string) {
  await page.locator('#ie-address').fill(query);
  await page.locator('#ie-address').press('Enter');
  await expect(page.locator('[data-search-results]')).not.toHaveAttribute('aria-busy');
}

test('real site search stays local, searches articles and projects, and keeps search history', async ({ page }) => {
  const external: string[] = [];
  let indexRequests = 0;
  page.on('request', r => {
    if (r.url().endsWith('/zh/search.json')) indexRequests++;
    if (!r.url().startsWith('http://127.0.0.1:4321') && !r.url().startsWith('http://localhost:4321')) external.push(r.url());
  });
  await open(page);
  expect(indexRequests).toBe(0);
  await page.locator('#ie-home-query').fill('回退');
  await page.locator('#ie-home-query').press('Enter');
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();
  await expect(page.locator('[data-search-heading]')).toBeFocused();
  await expect(page.locator('[data-search-results] a').first()).toHaveAttribute('href', /\/zh\/blog\//);
  await expect(page.locator('[data-browser-frame] iframe')).toHaveCount(0);
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations);
  expect(violations).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-search-results] a').first()).toBeFocused();
  await search(page, 'open-deep-research');
  const project = page.locator('[data-search-results] a[href*="#project-"]').first();
  await expect(project).toBeVisible();
  const href = await project.getAttribute('href');
  await project.click();
  await expect(page.locator('#window-projects')).toHaveClass(/is-active/);
  await expect(page.locator(href!.slice(href!.indexOf('#')))).toBeFocused();
  await page.locator('[data-task="browser"]').click();
  await page.locator('[data-browser-action="back"]').click();
  await expect(page.locator('#ie-search-query')).toHaveValue('回退');
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();
  await page.locator('[data-browser-action="forward"]').click();
  await expect(page.locator('#ie-search-query')).toHaveValue('open-deep-research');
  await page.locator('[data-browser-action="refresh"]').click();
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();
  expect(indexRequests).toBe(1);
  expect(external).toEqual([]);
  await search(page, 'zzzznoresultzzzz');
  await expect(page.locator('[data-search-message]')).toContainText('没有找到');
  await search(page, '<img src=x onerror=alert(1)>');
  await expect(page.locator('[data-search-heading]')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('[data-browser-search] img')).toHaveCount(0);
});

test('articles open as real site pages and the public domain maps to local preview', async ({ page }) => {
  await open(page);
  await search(page, 'Hello');
  const article = page.locator('[data-search-results] a[href*="/blog/hello-world"]').first();
  await expect(article).toBeVisible();
  const href = await article.getAttribute('href');
  await article.click();
  await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  await expect(page.locator('#window-article')).toBeVisible();
  await page.locator('.desktop-icons [data-open="browser"]').click();
  await page.locator('#ie-address').fill('https://extracurricular.ai/zh/about');
  await page.locator('#ie-address').press('Enter');
  await expect(page).toHaveURL(/127\.0\.0\.1:4321\/zh\/about\/?$/);
  await expect(page.locator('#window-about')).toBeVisible();
});

test('failed index requests can be retried and stale responses do not replace the home screen', async ({ page }) => {
  let fail = true;
  await page.route('**/zh/search.json', async route => {
    if (fail) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.continue();
  });
  await open(page);
  await search(page, 'Cursor');
  await expect(page.locator('[data-search-heading]')).toContainText('暂时无法加载');
  fail = false;
  await page.locator('[data-browser-action="refresh"]').click();
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();
  await page.reload();
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/zh/search.json', async route => { await ready; await route.continue(); });
  await page.locator('.desktop-icons [data-open="browser"]').click();
  await page.locator('#ie-home-query').fill('Cursor');
  await page.locator('#ie-home-query').press('Enter');
  await expect(page.locator('[data-search-results]')).toHaveAttribute('aria-busy', 'true');
  await page.locator('[data-browser-action="home"]').click();
  const response = page.waitForResponse('**/zh/search.json');
  release(); await response;
  await expect(page.locator('[data-browser-home]')).toBeVisible();
  await expect(page.locator('[data-browser-search]')).toBeHidden();
  await expect(page.locator('[data-browser-status]')).toContainText('准备就绪');
});

for (const locale of ['en', 'es', 'fr']) {
  test(`${locale}: localized search supports keyboard input and narrow screens`, async ({ page }) => {
    await open(page, locale);
    await search(page, 'Cursor');
    await expect(page.locator('[data-search-results] li').first()).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-browser-action="search"]').click();
    await expect(page.locator('#ie-search-query')).toBeFocused();
    await expect(page.locator('#ie-search-query')).toHaveValue('');
  });
}
