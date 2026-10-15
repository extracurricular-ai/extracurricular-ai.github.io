import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainText, searchSite } from '../src/lib/site-search.ts';
import { isSearchInput, searchAddress, searchQuery, siteAddress } from '../src/lib/browser.ts';

const doc = (title, text = '', locale = 'en') => ({ title, text, locale, description: '', href: '/en/blog/test', kind: 'article' });
test('search matches Chinese, multiple terms, accented text and ranks title matches first', () => {
  const documents = [doc('Guide', 'Rewind Cursor'), doc('Cursor Rewind'), doc('回退教程', '恢复文件', 'zh'), doc('Café')];
  assert.deepEqual(searchSite(documents, 'CURSOR rewind', 'en').map(d => d.title), ['Cursor Rewind', 'Guide']);
  assert.equal(searchSite(documents, '回退 文件', 'zh')[0].title, '回退教程');
  assert.equal(searchSite(documents, 'cafe', 'fr')[0].title, 'Café');
  assert.deepEqual(searchSite(documents, 'missing', 'en'), []);
  assert.deepEqual(searchSite(documents, '   ', 'en'), []);
  assert.deepEqual(searchSite(documents, '[.*+?', 'en'), []);
  assert.equal(searchSite([doc('Rewind', '', 'en'), doc('Rewind', '', 'zh')], 'rewind', 'zh')[0].locale, 'zh');
});

test('index text strips markup without losing link labels and code content', () => {
  assert.equal(plainText('# Title\n[Guide](https://example.com)\n```sh\n/rewind\n```\n<!-- hidden --> <b>Help</b>'), 'Title Guide /rewind Help');
});

test('site addresses stay on this deployment and lookalike domains are not treated as local', () => {
  const origin = 'http://localhost:4321';
  assert.equal(siteAddress('extracurricular.ai', origin, 'zh'), '/zh/');
  assert.equal(siteAddress('https://extracurricular.ai/en/blog/hello-world', origin, 'zh'), '/en/blog/hello-world/');
  assert.equal(siteAddress('https://www.extracurricular.ai/zh/projects#project-test', origin, 'zh'), '/zh/projects/#project-test');
  assert.equal(siteAddress('/zh/about', origin, 'zh'), '/zh/about/');
  assert.equal(siteAddress('/zh/search.json?q=test', origin, 'zh'), '/zh/search.json?q=test');
  for (const input of ['https://extracurricular.ai.evil.example', '//evil.example', 'https://extracurricular.ai@evil.example', 'https://user@extracurricular.ai', 'javascript:alert(1)']) assert.equal(siteAddress(input, origin, 'zh'), null);
});

test('search history encodes queries as data and distinguishes keywords from website addresses', () => {
  for (const value of ['回退 文件', 'Cursor', 'café', '<script>alert(1)</script>', 'site:extracurricular.ai']) assert.equal(searchQuery(searchAddress(value)), value);
  assert.equal(searchQuery('https://example.com/?q=test'), null);
  assert.equal(searchQuery('exai://search'), '');
  assert.equal(searchQuery(searchAddress('a'.repeat(300))).length, 200);
  for (const input of ['回退 文件', 'Cursor', 'hello world']) assert.equal(isSearchInput(input), true);
  for (const input of ['', 'javascript:alert(1)', 'example.com', 'http://example.com', 'example.com/path', '/en/about']) assert.equal(isSearchInput(input), false);
});
