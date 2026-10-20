import { test, expect } from '@playwright/test';

test('sitemap pages have complete metadata and reciprocal language alternatives', async ({ page, request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  expect(urls.length).toBeGreaterThan(20);
  await page.goto('/en/');
  const pages = new Map<string, { alternatives: { lang: string; href: string }[] }>();
  for (const url of urls) {
    const response = await request.get(new URL(url).pathname);
    expect(response.status(), url).toBe(200);
    const html = await response.text();
    const data = await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const meta = (key: string) => doc.querySelector(`meta[name="${key}"],meta[property="${key}"]`)?.getAttribute('content');
      return {
        title: doc.title, description: meta('description'), lang: doc.documentElement.lang,
        canonicals: [...doc.querySelectorAll('link[rel="canonical"]')].map(el => el.getAttribute('href')),
        alternatives: [...doc.querySelectorAll('link[hreflang]')].map(el => ({ lang: el.getAttribute('hreflang')!, href: el.getAttribute('href')! })),
        image: meta('og:image'), twitterImage: meta('twitter:image'),
        headings: doc.querySelectorAll('h1').length,
        schema: JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!),
      };
    }, html);
    expect(data.canonicals, url).toEqual([url]);
    expect(new URL(url).pathname).toMatch(/\/$/);
    expect(data.title.replace(/ \| ExAI$/, '').trim().length, url).toBeGreaterThan(0);
    expect(data.description!.length).toBeGreaterThan(20);
    expect(data.headings, url).toBe(1);
    expect(data.lang).toBe(new URL(url).pathname.split('/')[1]);
    expect(data.image).toMatch(/^https:\/\/extracurricular\.ai\//);
    expect(new URL(data.image!).pathname).toMatch(/\.(png|jpg)$/);
    expect(data.twitterImage).toBe(data.image);
    expect((await request.get(new URL(data.image!).pathname)).ok(), data.image!).toBe(true);
    if (/\/blog\/.+\/$/.test(url)) {
      const article = data.schema['@graph'].find((node: any) => node['@type'] === 'BlogPosting');
      expect(article.mainEntityOfPage).toBe(url);
      expect(article.headline).toBe(data.title.replace(/ \| ExAI$/, ''));
      expect(article.author.name).toBeTruthy();
      expect(Number.isNaN(Date.parse(article.datePublished))).toBe(false);
      if (article.dateModified) expect(Date.parse(article.dateModified)).toBeGreaterThanOrEqual(Date.parse(article.datePublished));
    }
    pages.set(url, data);
  }
  for (const [url, data] of pages) {
    for (const alternate of data.alternatives) {
      expect(pages.has(alternate.href), `${url} -> ${alternate.href}`).toBe(true);
      expect(pages.get(alternate.href)!.alternatives.some(link => link.href === url), url).toBe(true);
    }
  }
});

test('content navigation updates the URL, title and canonical, and supports browser history', async ({ page }) => {
  await page.goto('/en/');
  const homeTitle = await page.title();
  await page.locator('.desktop-icons [data-app-link="blog"]').click();
  await expect(page).toHaveURL(/\/en\/blog\/$/);
  await expect(page).toHaveTitle('Developer Tool Tutorials & Software Guides | ExAI');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://extracurricular.ai/en/blog/');
  await expect(page.locator('#window-blog h1')).toHaveCount(1);
  await expect(page.locator('#window-home')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveTitle(homeTitle);
  await expect(page).toHaveURL(/\/en\/$/);
});

test('terminal files load only on demand and a failed request can be retried', async ({ page }) => {
  let requests = 0;
  let fail = true;
  await page.route('**/en/terminal.json', async route => {
    requests++;
    if (fail) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.continue();
  });
  await page.goto('/en/');
  expect(requests).toBe(0);
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.locator('#hero-terminal-input')).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#hero-terminal-input')).toBeEnabled();
  expect(requests).toBe(2);
  await page.locator('#hero-terminal-input').fill('cat /README.md');
  await page.locator('#hero-terminal-input').press('Enter');
  await expect(page.locator('.terminal-text').last()).toContainText('Extracurricular AI');
  await page.locator('#window-terminal [data-window-action="minimize"]').click();
  await page.locator('[data-task="terminal"]').click();
  expect(requests).toBe(2);
});

test('article images are responsive, load successfully and fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/blog/cursor-chat-history-storage/');
  const picture = page.locator('article picture').first();
  await expect(picture.locator('source[type="image/avif"]')).toHaveAttribute('srcset', /320w.*640w/);
  await expect(picture.locator('source[type="image/webp"]')).toHaveAttribute('srcset', /320w.*640w/);
  const img = picture.locator('img');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect.poll(() => img.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
