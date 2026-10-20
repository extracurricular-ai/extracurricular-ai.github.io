import { test, expect, type Page } from '@playwright/test';
const api = 'https://aihorde.net/api/v2';
async function open(page: Page) {
  await page.goto('/zh/');
  await page.locator('.system-tray [data-open="messenger"]').click();
  await expect(page.locator('.msn-contact')).toHaveCount(4);
  await page.locator('.msn-contact').first().click();
  await expect(page.locator('#msn-message')).toBeFocused();
}
async function audit(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  expect(await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('#window-messenger'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations)).toEqual([]);
}

test('anonymous chat queues, preserves personas and history, renders text safely, and supports window controls', async ({ page }) => {
  const requests: { method: string; body: any; key?: string }[] = [];
  let polls = 0;
  await page.route(`${api}/**`, route => {
    const req = route.request();
    requests.push({ method: req.method(), body: req.postDataJSON(), key: req.headers().apikey });
    if (req.method() === 'POST') return route.fulfill({ status: 202, json: { id: 'test-job' } });
    return route.fulfill({ json: ++polls === 1 ? { done: false, queue_position: 2, wait_time: 8, processing: 0 } : { done: true, generations: [{ text: '你好！<img src=x onerror=alert(1)> 今天想听什么歌？', model: 'test-model' }] } });
  });
  await open(page);
  expect(requests).toEqual([]);
  await page.locator('#msn-message').fill('今天想聊聊音乐');
  await page.locator('#msn-message').press('Enter');
  await expect(page.locator('.msn-message-user')).toHaveCount(1);
  await expect(page.locator('.msn-progress')).toContainText('排队位置 2', { timeout: 8000 });
  await expect(page.locator('.msn-message-assistant').last()).toContainText('<img src=x', { timeout: 10000 });
  await expect(page.locator('.msn-transcript img')).toHaveCount(0);
  expect(requests[0].key).toBe('0000000000');
  expect(requests[0].body.prompt).toContain('music-loving');
  expect(requests[0].body.prompt).toContain('今天想聊聊音乐');
  await audit(page);
  await page.locator('.msn-contact').nth(1).click();
  await expect(page.locator('.msn-transcript')).not.toContainText('今天想聊聊音乐');
  await page.locator('#msn-message').fill('电脑怎么开机');
  await page.locator('#msn-message').press('Enter');
  await expect.poll(() => requests.filter(r => r.method === 'POST').length).toBe(2);
  const second = requests.filter(r => r.method === 'POST')[1].body.prompt;
  expect(second).toContain('tinkerer');
  expect(second).not.toContain('今天想聊聊音乐');
  await page.locator('.msn-contact').first().click();
  await expect(page.locator('.msn-transcript')).toContainText('今天想聊聊音乐');
  await page.locator('#window-messenger [data-window-action="minimize"]').click();
  await expect(page.locator('#window-messenger')).toBeHidden();
  await page.locator('[data-task="messenger"]').click();
  await expect(page.locator('.msn-transcript')).toContainText('今天想聊聊音乐');
  await page.locator('#window-messenger [data-window-action="close"]').click();
  await expect(page.locator('.system-tray [data-open="messenger"]')).toBeFocused();
});

test('rate limit is honest, retry does not duplicate messages, and cancellation deletes the queued job', async ({ page }) => {
  let posts = 0;
  let deletes = 0;
  await page.route(`${api}/**`, route => {
    if (route.request().method() === 'POST') return ++posts === 1 ? route.fulfill({ status: 429, json: { message: 'busy' } }) : route.fulfill({ status: 202, json: { id: 'cancel-me' } });
    if (route.request().method() === 'DELETE') { deletes++; return route.fulfill({ json: {} }); }
    return route.fulfill({ json: { done: false, queue_position: 10, wait_time: 60 } });
  });
  await open(page);
  await page.locator('#msn-message').fill('你好呀');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.msn-error')).toContainText('匿名服务有点忙');
  await page.getByRole('button', { name: '重新试试' }).click();
  await expect(page.locator('.msn-message-user')).toHaveCount(1);
  await expect(page.locator('.msn-progress')).toContainText('正在等待志愿者');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('.msn-error')).toContainText('已停止');
  await expect.poll(() => deletes).toBe(1);
  await expect(page.getByRole('button', { name: '重新试试' })).toBeEnabled();
});

test('composition does not send, close cancels, and msn terminal command opens the easter egg', async ({ page }) => {
  let posts = 0;
  let deletes = 0;
  await page.route(`${api}/**`, route => {
    if (route.request().method() === 'POST') { posts++; return route.fulfill({ status: 202, json: { id: 'closing' } }); }
    if (route.request().method() === 'DELETE') deletes++;
    return route.fulfill({ json: { done: false } });
  });
  await open(page);
  await page.locator('#msn-message').fill('拼音输入');
  await page.locator('#msn-message').dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  expect(posts).toBe(0);
  await page.locator('#msn-message').press('Enter');
  await expect(page.locator('.msn-progress')).toContainText('正在等待志愿者');
  await page.locator('#window-messenger [data-window-action="close"]').click();
  await expect.poll(() => deletes).toBe(1);
  await page.locator('.desktop-icons [data-open="terminal"]').click();
  await page.locator('#hero-terminal-input').fill('msn');
  await page.locator('#hero-terminal-input').press('Enter');
  await expect(page.locator('#window-messenger')).toBeVisible();
  await expect(page.locator('#window-messenger')).toBeFocused();
});

test('mobile reflow, clear, nudge and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  // Make the first-visit cookie choice before interacting beneath the banner.
  await page.getByRole('button', { name: '拒绝统计', exact: true }).click();
  await page.getByRole('button', { name: '发送抖动' }).click();
  await expect(page.locator('.msn-system-message')).toContainText('窗口抖动');
  expect(await page.locator('.msn').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.locator('#msn-message').fill('未发送的草稿');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '重新聊天' }).click();
  await expect(page.locator('#msn-message')).toHaveValue('');
  await page.getByRole('button', { name: '好友列表', exact: true }).click();
  await expect(page.locator('.msn-contact')).toHaveCount(4);
  await page.locator('.msn-contact').nth(3).click();
  await expect(page.locator('.msn-chat-heading h3')).toHaveText('老周');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await audit(page);
  }
});
