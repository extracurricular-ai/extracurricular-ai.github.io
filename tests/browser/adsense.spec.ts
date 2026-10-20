import { test, expect, type Page } from '@playwright/test';

const origin = 'https://extracurricular.ai';
const articlePath = '/en/blog/hello-world/';
const mock = `
window.__adPushes = 0;
window.__adInitialPaused = window.adsbygoogle.pauseAdRequests;
window.__tcfapi = (command, version, callback) => {
  window.__cmpEmit = callback;
  callback({gdprApplies:true, cmpStatus:'loaded', eventStatus:'cmpuishown'}, true);
};
window.googlefc.showRevocationMessage = () => {
  window.__revocations = (window.__revocations || 0) + 1;
  window.__cmpEmit({gdprApplies:true, cmpStatus:'loaded', eventStatus:'cmpuishown'}, true);
};
window.googlefc.callbackQueue.forEach(entry => entry.CONSENT_API_READY?.());
window.googlefc.callbackQueue.push = entry => { entry.CONSENT_API_READY?.(); };
window.adsbygoogle.push = () => {
  if (window.adsbygoogle.pauseAdRequests !== 0) throw Error('Requested before consent');
  const candidates = [...document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])')];
  if (candidates.length !== 1) throw Error('Ambiguous or hidden ad request');
  const ad = candidates[0];
  if (!ad.closest('.is-active') || ad.closest('[hidden],[inert]')) throw Error('Inactive ad request');
  window.__adPushes++;
  ad.dataset.adsbygoogleStatus = 'done';
  ad.dataset.adStatus = 'filled';
  const creative = document.createElement('iframe');
  creative.title = 'Test advertisement';
  creative.style.cssText = 'width:100%;height:250px;border:0';
  ad.append(creative);
};`;

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); });

async function setup(page: Page, baseURL: string, mode: 'normal' | 'missing-cmp' | 'blocked' = 'normal') {
  const requests: string[] = [];
  await page.route('https://**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) {
      const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    } else {
      requests.push(url.href);
      if (url.hostname === 'pagead2.googlesyndication.com') {
        if (mode === 'blocked') await route.abort();
        else await route.fulfill({ contentType: 'application/javascript', body: mode === 'normal' ? mock : '' });
      } else {
        await route.fulfill({ contentType: 'application/javascript', body: '' });
      }
    }
  });
  return requests;
}

async function consent(page: Page, granted: boolean, gdpr = true) {
  await page.evaluate(({ granted, gdpr }) => {
    (window as any).__cmpEmit({
      gdprApplies: gdpr, cmpStatus: 'loaded', eventStatus: 'useractioncomplete',
      purpose: { consents: { 1: granted } }, vendor: { consents: { 755: granted } },
    }, true);
  }, { granted, gdpr });
}
async function count(page: Page) { return page.evaluate(() => (window as any).__adPushes ?? 0); }

test('manual ads wait for CMP, stay separate from GA and support revocation', async ({ page, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production only');
  const requests = await setup(page, baseURL!);
  await page.goto(`${origin}${articlePath}`);
  await expect.poll(() => page.evaluate(() => (window as any).__adInitialPaused)).toBe(1);
  expect(await count(page)).toBe(0);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  expect(await count(page)).toBe(0);
  await consent(page, false);
  await expect(page.locator('[data-article-ad]')).toBeHidden();
  await consent(page, true);
  const ad = page.locator('[data-article-ad]');
  await ad.scrollIntoViewIfNeeded();
  await expect.poll(() => count(page)).toBe(1);
  await expect(ad.locator('ins')).toHaveAttribute('data-ad-slot', '5669534073');
  await expect(ad.locator('ins')).toHaveAttribute('data-full-width-responsive', 'false');
  await page.locator('#window-article [data-window-action="maximize"]').click();
  await page.locator('#window-article [data-window-action="maximize"]').click();
  expect(await count(page)).toBe(1);
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Advertising privacy settings', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__revocations)).toBe(1);
  await consent(page, false);
  await expect(ad).toBeHidden();
  await expect(ad.locator('iframe')).toHaveCount(0);
  await consent(page, true);
  expect(await count(page)).toBe(1);
  expect(requests.filter(url => url.includes('adsbygoogle.js'))).toHaveLength(1);
});

test('dynamic articles share one loader and cached windows never refresh ads', async ({ page, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production only');
  const requests = await setup(page, baseURL!);
  await page.goto(`${origin}/en/blog/`);
  await page.getByRole('button', { name: 'Reject analytics', exact: true }).click();
  expect(requests).toEqual([]);
  const links = page.locator('#window-blog a[href*="/en/blog/"]');
  await links.first().click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).__cmpEmit)).toBe('function');
  await consent(page, false, false);
  await page.locator('#window-article [data-article-ad]').scrollIntoViewIfNeeded();
  await expect.poll(() => count(page)).toBe(1);
  await page.locator('[data-task="blog"]').click();
  await links.nth(1).click();
  const other = page.locator('[data-window^="article-"] [data-article-ad]');
  await other.scrollIntoViewIfNeeded();
  await expect.poll(() => count(page)).toBe(2);
  await page.locator('[data-task="article"]').click();
  await page.locator('#window-article [data-window-action="minimize"]').click();
  await page.locator('[data-task="article"]').click();
  await page.locator('#window-article [data-article-ad]').scrollIntoViewIfNeeded();
  expect(await count(page)).toBe(2);
  expect(requests.filter(url => url.includes('adsbygoogle.js'))).toHaveLength(1);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.locator('#window-article [data-article-ad]')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await count(page)).toBe(2);
});

test('unfilled ads collapse without re-requesting on activation', async ({ page, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production only');
  await setup(page, baseURL!);
  await page.goto(`${origin}${articlePath}`);
  await page.getByRole('button', { name: 'Reject analytics', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).__cmpEmit)).toBe('function');
  await consent(page, true);
  const ad = page.locator('[data-article-ad]');
  await ad.scrollIntoViewIfNeeded();
  await expect.poll(() => count(page)).toBe(1);
  await ad.locator('ins').evaluate(el => { (el as HTMLElement).dataset.adStatus = 'unfilled'; });
  await expect(ad).toBeHidden();
  await page.locator('#window-article .os-titlebar').click();
  expect(await count(page)).toBe(1);
});

for (const mode of ['missing-cmp', 'blocked'] as const) {
  test(`${mode}: article remains readable and no ads are requested`, async ({ page, baseURL }) => {
    test.skip(process.env.PLAYWRIGHT_SERVER === 'dev', 'Production only');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await setup(page, baseURL!, mode);
    await page.goto(`${origin}${articlePath}`);
    await expect(page.locator('#window-article h1')).toBeVisible();
    await expect(page.locator('[data-article-ad]')).toBeHidden();
    expect(await count(page)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('local mobile preview shows placement only, with no Google requests', async ({ page, request }) => {
  const requests: string[] = [];
  await page.route('https://**/*', async route => {
    requests.push(route.request().url()); await route.fulfill({ body: '' });
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/zh/blog/hello-world/');
  await page.getByRole('button', { name: '拒绝统计', exact: true }).click();
  const ad = page.locator('[data-article-ad]');
  await ad.scrollIntoViewIfNeeded();
  await expect(ad).toContainText('广告位预览');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  expect(await (await request.get('/ads.txt')).text()).toBe('google.com, pub-4514332323196968, DIRECT, f08c47fec0942fa0\n');
});
