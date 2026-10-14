import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BROWSER_HOME, browserUrl, visitAddress } from '../src/lib/browser.ts';

test('browser addresses normalize HTTPS domains while preserving paths, ports, query and fragment', () => {
  assert.equal(browserUrl(' example.com '), 'https://example.com/');
  assert.equal(browserUrl('EXAMPLE.com/a?q=hello#part'), 'https://example.com/a?q=hello#part');
  assert.equal(browserUrl('example.com:8443/path'), 'https://example.com:8443/path');
  assert.equal(browserUrl('https://例子.测试/'), 'https://xn--fsqu00a.xn--0zwm56d/');
});

test('browser rejects executable URLs, insecure frames, credentials and recursive desktops', () => {
  for (const input of ['', 'hello world', 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'blob:https://example.com/id', 'http://example.com', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com@evil.example', 'https://example.com/\npath']) {
    assert.equal(browserUrl(input), null, input);
  }
  assert.equal(browserUrl('https://extracurricular.ai/zh/', 'https://extracurricular.ai'), null);
  assert.equal(browserUrl('https://example.com/', 'https://extracurricular.ai'), 'https://example.com/');
});

test('address history handles duplicate refresh, backtracking, branches and a bounded lifetime', () => {
  let history = { entries: [BROWSER_HOME], index: 0 };
  history = visitAddress(history, 'https://one.example/');
  assert.strictEqual(visitAddress(history, 'https://one.example/'), history);
  history = visitAddress(history, 'https://two.example/');
  history = visitAddress({ ...history, index: 1 }, 'https://three.example/');
  assert.deepEqual(history.entries, [BROWSER_HOME, 'https://one.example/', 'https://three.example/']);
  assert.equal(history.index, 2);
  for (let i = 0; i < 120; i++) history = visitAddress(history, `https://example.com/${i}`);
  assert.equal(history.entries.length, 100);
  assert.equal(history.index, 99);
});
