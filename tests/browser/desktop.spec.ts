import { test, expect, type Page } from '@playwright/test';
const axePath = require.resolve('axe-core/axe.min.js');

async function audit(page: Page) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (options: object) => Promise<{ violations: unknown[] }> } }).axe;
    return (await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations;
  });
  expect(violations).toEqual([]);
}

for (const locale of ['zh', 'en', 'es', 'fr']) {
  test(`${locale}: initial desktop semantics, contrast and keyboard Start menu`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/${locale}/`);
    await expect(page.locator('#window-home')).toBeVisible();
    await expect(page.locator('#hero-terminal-input')).not.toBeFocused();
    await audit(page);
    await page.locator('#start-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#start-button')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#start-menu [data-app-link="home"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#start-menu [data-app-link="projects"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#start-menu')).toBeHidden();
    await expect(page.locator('#start-button')).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test('windows open, move without dragging, maximize, minimize, restore and return focus', async ({ page }) => {
  await page.goto('/zh/');
  const icon = page.locator('.desktop-icons [data-app-link="projects"]');
  await icon.focus(); await page.keyboard.press('Enter');
  const window = page.locator('#window-projects');
  await expect(page).toHaveURL(/\/zh\/projects\/$/);
  await expect(window).toBeVisible();
  await expect(page.locator('#window-home')).toBeVisible();
  await expect(window).toBeFocused();
  const before = await window.boundingBox();
  await window.locator('[data-move-toggle]').click();
  await window.locator('[data-move="right"]').click();
  expect((await window.boundingBox())!.x).toBeGreaterThan(before!.x);
  await page.keyboard.press('Escape');
  await expect(window.locator('[data-move-toggle]')).toBeFocused();
  await window.locator('[data-window-action="maximize"]').click();
  await expect(window).toHaveClass(/is-maximized/);
  await window.locator('[data-window-action="maximize"]').click();
  await expect(window).not.toHaveClass(/is-maximized/);
  await window.locator('[data-window-action="minimize"]').click();
  await expect(window).toBeHidden();
  await expect(page.locator('[data-task="projects"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(window).toBeVisible();
  await audit(page);
  await window.locator('[data-window-action="close"]').click();
  await expect(window).toBeHidden(); await expect(icon).toBeFocused();
  await expect(page.locator('[data-task="projects"]')).toBeHidden();
  await icon.click();
  await expect(window).toBeVisible();
  await page.locator('[data-show-desktop]').click();
  await expect(page.locator('[data-window]:visible')).toHaveCount(0);
  await page.locator('[data-show-desktop]').click();
  await expect(window).toBeVisible();
});

test('all content windows and a direct article remain readable and accessible', async ({ page }) => {
  await page.goto('/zh/projects/');
  await expect(page.locator('#window-projects')).toBeVisible();
  for (const id of ['blog', 'about', 'get-involved']) {
    await page.locator(`.desktop-icons [data-app-link="${id}"]`).click();
    await expect(page.locator(`#window-${id}`)).toBeVisible();
    await audit(page);
    await page.locator(`#window-${id} [data-window-action="close"]`).click();
  }
  await page.goto('/zh/blog/hello-world/');
  await expect(page.locator('#window-article article')).toBeVisible();
  await audit(page);
});

test('terminal retains commands, history, completion, output and arcade state', async ({ page }) => {
  await page.goto('/zh/');
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  const input = page.locator('#hero-terminal-input');
  await input.fill('neof'); await input.press('Tab');
  await expect(input).toHaveValue('neofetch ');
  await input.press('Enter');
  await expect(page.locator('.terminal-text').last()).toContainText('curiosity 1.0');
  await input.press('ArrowUp'); await expect(input).toHaveValue('neofetch');
  await input.fill('cd /blog'); await input.press('Enter');
  await input.fill('cat hello-world.md'); await input.press('Enter');
  await expect(page.locator('.terminal-text').last()).toContainText('ExAI');
  await input.fill('pwd'); await input.press('Enter');
  await expect(page.locator('.terminal-text').last()).toContainText('/home/visitor/blog');
  await input.fill('coffee'); await input.press('Tab'); await input.press('Tab');
  await expect(input).not.toBeFocused();
  await page.locator('#window-terminal [data-window-action="minimize"]').click();
  await page.locator('[data-task="terminal"]').click();
  await expect(page.locator('.terminal-text').filter({ hasText: '/home/visitor/blog' })).toBeVisible();
  await input.fill('pwd'); await input.press('Enter');
  await expect(page.locator('.terminal-text').last()).toContainText('/home/visitor/blog');
  await audit(page);
  await input.fill('play invaders'); await input.press('Enter');
  await expect(page.locator('.arcade')).toBeVisible();
  await page.locator('.arcade-overlay button').click();
  await page.locator('#window-terminal [data-window-action="minimize"]').click();
  await page.locator('[data-task="terminal"]').click();
  await expect(page.locator('.arcade-overlay h3')).toContainText('暂停');
  await page.locator('.arcade').focus(); await page.keyboard.press('Escape');
  await expect(input).toBeFocused();
});

test('Invaders fills the maximized terminal and restores its normal sizing', async ({ page }) => {
  await page.goto('/zh/');
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  const input = page.locator('#hero-terminal-input');
  await input.fill('play invaders');
  await input.press('Enter');
  const terminal = page.locator('#window-terminal');
  const stage = terminal.locator('.arcade-stage');
  const canvas = stage.locator('canvas');
  const maximize = terminal.locator('[data-window-action="maximize"]');
  const normalHeight = (await stage.boundingBox())!.height;
  expect(normalHeight).toBeLessThanOrEqual(322);

  await maximize.click();
  await expect.poll(async () => (await stage.boundingBox())!.height).toBeGreaterThan(normalHeight + 100);
  const maximizedHeight = (await stage.boundingBox())!.height;
  expect((await canvas.boundingBox())!.height).toBeCloseTo(maximizedHeight - 2, 0);
  await expect(canvas).toHaveAttribute('width', '480');
  await expect(canvas).toHaveAttribute('height', '280');
  expect(await canvas.evaluate(el => getComputedStyle(el).objectFit)).toBe('contain');
  const space = await terminal.evaluate(el => {
    const shell = el.querySelector('.terminal-window')!.getBoundingClientRect();
    const game = el.querySelector('.arcade')!.getBoundingClientRect();
    const body = el.querySelector('.os-window-body')!;
    return { gap: shell.bottom - game.bottom, overflow: body.scrollHeight - body.clientHeight };
  });
  expect(Math.abs(space.gap)).toBeLessThan(2);
  expect(space.overflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1440, height: 1200 });
  await expect.poll(async () => (await stage.boundingBox())!.height).toBeGreaterThan(maximizedHeight + 190);
  await maximize.click();
  await expect.poll(async () => (await stage.boundingBox())!.height).toBeCloseTo(normalHeight, 0);

  await maximize.click();
  await page.setViewportSize({ width: 1440, height: 520 });
  const controls = terminal.locator('.arcade-controls');
  await controls.scrollIntoViewIfNeeded();
  await expect(controls).toBeInViewport();
  expect((await stage.boundingBox())!.height).toBeGreaterThanOrEqual(180);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await stage.boundingBox())!.height).toBeLessThanOrEqual(322);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await terminal.locator('.os-menubar [data-open="settings"]').click();
  await page.locator('[data-preference="simple"]').check();
  await expect.poll(async () => (await stage.boundingBox())!.height).toBeLessThanOrEqual(322);
});

test('accessibility preferences persist, including reduced motion and list layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh/');
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');
  await page.locator('.desktop-icons [data-open="settings"]').click();
  for (const pref of ['contrast', 'large', 'motion', 'simple']) await page.locator(`[data-preference="${pref}"]`).check();
  await expect(page.locator('[data-desktop]')).toHaveClass(/pref-simple/);
  await expect(page.locator('#window-home .os-window-body')).not.toHaveAttribute('inert', '');
  await audit(page);
  await page.reload();
  await page.locator('.desktop-icons [data-open="settings"]').click();
  for (const pref of ['contrast', 'large', 'motion', 'simple']) await expect(page.locator(`[data-preference="${pref}"]`)).toBeChecked();
  await page.locator('#window-settings [data-window-action="close"]').click();
  await expect(page.locator('.desktop-icons [data-open="settings"]')).toBeFocused();
});

test('mobile and 400% equivalent reflow have no horizontal page overflow', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/zh/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.desktop-icons [data-app-link="projects"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await audit(page);
  }
});

test('without JavaScript, content and ordinary route links still work', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/zh/');
  await expect(page.locator('#window-home h1')).toBeVisible();
  await page.locator('.desktop-icons [data-app-link="projects"]').click();
  await expect(page).toHaveURL(/\/zh\/projects\/?$/);
  await expect(page.locator('#window-projects h1')).toBeVisible();
  await context.close();
});

test('forced colors and keyboard focus remain usable with overlapping windows', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/zh/');
  await page.locator('.desktop-icons [data-open="settings"]').click();
  await expect(page.locator('#window-home .os-window-body')).toHaveAttribute('inert', '');
  await page.locator('[data-task="home"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#window-home .welcome-actions a').first().focus();
  await expect(page.locator('#window-home')).toHaveClass(/is-active/);
  const unobscured = await page.locator('#window-home .welcome-actions a').first().evaluate(el => {
    const rect = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  });
  expect(unobscured).toBe(true);
  await audit(page);
  await page.setViewportSize({ width: 320, height: 600 });
  await page.locator('.desktop-icons [data-open="settings"]').click();
  await page.locator('[data-preference="large"]').check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
