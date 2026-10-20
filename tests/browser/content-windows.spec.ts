import { test, expect } from '@playwright/test';

test('content windows load on demand and preserve terminal, search and window state', async ({ page }) => {
  const errors: string[] = [];
  const documents: string[] = [];
  let aboutRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url());
    if (new URL(request.url()).pathname === '/en/about/') aboutRequests++;
  });
  await page.goto('/en/');
  await expect(page.locator('#window-about')).toHaveCount(0);
  expect(aboutRequests).toBe(0);
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  const input = page.locator('#hero-terminal-input');
  await input.fill('cd /blog'); await input.press('Enter');
  await input.fill('echo keep this draft');
  await page.locator('.desktop-icons [data-open="browser"]').click();
  await page.locator('#ie-address').fill('Cursor');
  await page.locator('#ie-address').press('Enter');
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();

  await page.locator('.desktop-icons [data-app-link="about"]').click();
  const about = page.locator('#window-about');
  await expect(about).toBeVisible();
  await about.locator('[data-move-toggle]').click();
  await about.locator('[data-move="right"]').click();
  const position = await about.boundingBox();
  await page.locator('.desktop-icons [data-app-link="blog"]').click();
  await expect(page.locator('#window-blog')).toHaveClass(/is-active/);
  await expect(about).toBeVisible();
  await expect(page.locator('#window-home')).toBeVisible();
  await expect(page.locator('#window-terminal')).toBeVisible();
  await page.locator('[data-task="terminal"]').click();
  await expect(input).toHaveValue('echo keep this draft');
  await input.fill('pwd'); await input.press('Enter');
  await expect(page.locator('.terminal-text').last()).toContainText('/home/visitor/blog');
  await page.locator('[data-task="browser"]').click();
  await expect(page.locator('#ie-search-query')).toHaveValue('Cursor');
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();
  await page.locator('[data-task="about"]').click();
  expect((await about.boundingBox())!.x).toBe(position!.x);
  await about.locator('[data-window-action="close"]').click();
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(about).toHaveClass(/is-active/);
  expect((await about.boundingBox())!.x).toBe(position!.x);
  expect(aboutRequests).toBe(1);
  expect(documents).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('multiple articles keep separate windows and history restores the active document', async ({ page }) => {
  await page.goto('/en/blog/');
  const links = page.locator('#window-blog a[href*="/en/blog/"]');
  const first = await links.first().getAttribute('href');
  const second = await links.nth(1).getAttribute('href');
  await links.first().click();
  const article = page.locator('#window-article');
  await expect(article).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${first}$`));
  await page.locator('[data-task="blog"]').click();
  await links.nth(1).click();
  const other = page.locator('[data-window^="article-"]');
  await expect(other).toHaveCount(1);
  await expect(other).toHaveClass(/is-active/);
  await expect(article).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${second}$`));
  await page.goBack();
  await expect(page.locator('#window-blog')).toHaveClass(/is-active/);
  await page.goForward();
  await expect(other).toHaveClass(/is-active/);
  const heading = await other.locator('h1').textContent();
  await expect(page).toHaveTitle(`${heading} | ExAI`);
  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  expect(duplicateIds).toEqual([]);
});

test('failed content loads can retry without discarding a running terminal', async ({ page }) => {
  let fail = true;
  await page.route('**/en/about/', async route => {
    if (fail) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.continue();
  });
  await page.goto('/en/');
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  const input = page.locator('#hero-terminal-input');
  await input.fill('echo still here'); await input.press('Enter');
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(page.locator('.desktop-load-error')).toContainText('could not be loaded');
  await expect(page.locator('#window-terminal')).toBeVisible();
  await expect(page).toHaveURL(/\/en\/$/);
  fail = false;
  await page.locator('.desktop-load-error').getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('#window-about')).toBeVisible();
  await expect(page.locator('.desktop-load-error')).toHaveCount(0);
  await page.locator('[data-task="terminal"]').click();
  await expect(page.locator('.terminal-text').last()).toContainText('still here');
});

test('a slower window opens in the background without stealing the latest selection', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/en/about/', async route => { await gate; await route.continue(); });
  await page.goto('/en/');
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await page.locator('.desktop-icons [data-app-link="blog"]').click();
  await expect(page.locator('#window-blog')).toHaveClass(/is-active/);
  release();
  await expect(page.locator('#window-about')).toBeVisible();
  await expect(page.locator('#window-blog')).toHaveClass(/is-active/);
  await expect(page).toHaveURL(/\/en\/blog\/$/);
});

test('lazy community forms hydrate and retain drafts when switching windows', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (/hydrati|Expected a DOM node/i.test(message.text()) && message.type() !== 'debug') errors.push(message.text());
  });
  await page.goto('/en/');
  await page.locator('.desktop-icons [data-app-link="get-involved"]').click();
  const community = page.locator('#window-get-involved');
  const draft = community.locator('textarea');
  await draft.scrollIntoViewIfNeeded();
  await expect(community.locator('astro-island')).not.toHaveAttribute('ssr');
  await draft.fill('A persistent community draft');
  await page.locator('.desktop-icons [data-app-link="about"]').click();
  await expect(page.locator('#window-about')).toBeVisible();
  await page.locator('[data-task="get-involved"]').click();
  await expect(draft).toHaveValue('A persistent community draft');
  expect(errors).toEqual([]);
});
