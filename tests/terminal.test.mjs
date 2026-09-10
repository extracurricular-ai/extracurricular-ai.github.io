import assert from 'node:assert/strict';
import { test } from 'node:test';
import { children, complete, findFile, longestCommonPrefix, resolvePath } from '../src/lib/terminal.ts';

const files = [
  { path: '/', directory: true },
  { path: '/blog', directory: true },
  { path: '/blog/hello-world.md', title: 'Hello World', body: 'An actual article' },
  { path: '/blog/second-post.md' },
  { path: '/projects', directory: true },
  { path: '/README.md' },
  { path: '/.secret' },
];

test('navigation supports relative, absolute, home and project alias paths', () => {
  assert.equal(resolvePath('../projects', '/blog'), '/projects');
  assert.equal(resolvePath('~/blog/../project//', '/blog'), '/projects');
  assert.equal(resolvePath('/home/visitor/blog', '/projects'), '/blog');
  assert.equal(resolvePath('./hello-world.md', '/blog'), '/blog/hello-world.md');
  assert.equal(resolvePath('../../..', '/'), '/');
  assert.equal(resolvePath('project', '/blog'), '/blog/project');
});

test('listings include only direct children and hide secrets by default', () => {
  assert.deepEqual(children(files, '/').map((file) => file.path), ['/blog', '/projects', '/README.md']);
  assert.equal(children(files, '/', true).at(-1).path, '/.secret');
  assert.deepEqual(children(files, '/blog').map((file) => file.path), ['/blog/hello-world.md', '/blog/second-post.md']);
  assert.deepEqual(children(files, '/missing'), []);
});

test('articles can be read with or without a markdown extension', () => {
  assert.equal(findFile(files, '/blog/hello-world').body, 'An actual article');
  assert.equal(findFile(files, '/blog/hello-world.md').title, 'Hello World');
  assert.equal(findFile(files, '/blog').directory, true);
  assert.equal(findFile(files, '/blog/missing'), undefined);
  assert.equal(findFile(files, '/blog/hello'), undefined);
});

test('completion respects the current directory and command', () => {
  assert.deepEqual(complete('neof', '/', files), ['neofetch ']);
  assert.deepEqual(complete('cd bl', '/', files), ['cd blog/']);
  assert.deepEqual(complete('cat h', '/blog', files), ['cat hello-world.md']);
  assert.deepEqual(complete('cat ~/b', '/projects', files), ['cat ~/blog/']);
  assert.deepEqual(complete('cat ../R', '/blog', files), ['cat ../README.md']);
  assert.deepEqual(complete('cat .', '/', files), ['cat .secret']);
  assert.deepEqual(complete('cd R', '/', files), []);
  assert.deepEqual(complete('cat missing', '/', files), []);
});

test('shell syntax stays inert virtual path text', () => {
  assert.equal(findFile(files, resolvePath('$(whoami)', '/')), undefined);
  assert.equal(findFile(files, resolvePath('README.md; echo hello', '/')), undefined);
  assert.equal(findFile(files, resolvePath('<script>alert(1)</script>', '/')), undefined);
});

test('ambiguous completion extends to the longest common prefix before listing choices', () => {
  const posts = [
    ...files,
    { path: '/blog/dsh-rewind-restore-files.md' },
    { path: '/blog/dsh-rewind-plugin-comparison.md' },
  ];
  assert.equal(longestCommonPrefix(complete('cat d', '/blog', posts)), 'cat dsh-rewind-');
  assert.equal(longestCommonPrefix(complete('cat dsh-rewind-', '/blog', posts)), 'cat dsh-rewind-');
  assert.equal(longestCommonPrefix(complete('cat dsh-rewind-r', '/blog', posts)), 'cat dsh-rewind-restore-files.md');
  assert.equal(longestCommonPrefix(complete('cat ~/blog/d', '/', posts)), 'cat ~/blog/dsh-rewind-');
  assert.equal(longestCommonPrefix(complete('cat /blog/d', '/', posts)), 'cat /blog/dsh-rewind-');
  assert.equal(longestCommonPrefix(complete('c', '/', posts)), 'c');
  assert.equal(longestCommonPrefix(complete('neo', '/', posts)), 'neofetch ');
  assert.equal(longestCommonPrefix([]), '');
  assert.equal(longestCommonPrefix(['hello', 'world']), '');
  assert.equal(longestCommonPrefix(['文件😀', '文件😁']), '文件');
});
