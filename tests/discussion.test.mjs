import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDiscussionComments } from '../src/lib/discussion.ts';
import { COMMUNITY_DISCUSSION_URL } from '../src/config.ts';

const comment = (n, extra = {}) => ({ id: String(n), url: `${COMMUNITY_DISCUSSION_URL}#discussioncomment-${n}`, bodyText: `Comment ${n}`, createdAt: `2026-09-${String(n).padStart(2, '0')}T12:00:00Z`, isMinimized: false, author: { login: `person-${n}`, avatarUrl: 'https://avatars.githubusercontent.com/u/1', url: 'https://github.com/example' }, ...extra });
const response = (nodes, pageInfo = { hasPreviousPage: false, startCursor: null }) => new Response(JSON.stringify({ data: { repository: { discussion: { comments: { nodes, pageInfo } } } } }), { status: 200 });

test('missing credentials are unavailable, not an empty discussion', async () => {
  const result = await loadDiscussionComments(undefined, () => { throw new Error('Must not fetch without credentials'); });
  assert.deepEqual(result, { status: 'unavailable', comments: [] });
});

test('latest five visible comments are sorted newest first, excluding hidden content', async () => {
  const result = await loadDiscussionComments('test-token', async (url, options) => {
    assert.equal(url, 'https://api.github.com/graphql');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(JSON.parse(options.body).variables.number, 1);
    return response([null, ...[1, 2, 3, 4, 5, 6].map(n => comment(n)), comment(7, { isMinimized: true }), comment(8, { bodyText: '  ' })]);
  });
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.comments.map(c => c.id), ['6', '5', '4', '3', '2']);
  assert(!JSON.stringify(result).includes('test-token'));
});

test('pagination finds older visible comments when the recent page is minimized', async () => {
  let calls = 0;
  const result = await loadDiscussionComments('test-token', async (_, options) => {
    calls++;
    if (calls === 1) return response([comment(8, { isMinimized: true })], { hasPreviousPage: true, startCursor: 'older' });
    assert.equal(JSON.parse(options.body).variables.before, 'older');
    return response([comment(1), comment(2, { author: null })]);
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.comments.map(c => c.id), ['2', '1']);
  assert.equal(result.comments[0].author, null);
});

test('empty discussions are distinct from HTTP, GraphQL, and network failures', async () => {
  assert.equal((await loadDiscussionComments('test-token', async () => response([]))).status, 'ready');
  for (const request of [
    async () => new Response('', { status: 403 }),
    async () => new Response(JSON.stringify({ errors: [{ message: 'Denied' }] })),
    async () => new Response(JSON.stringify({ data: { repository: { discussion: null } } })),
    async () => { throw new Error('Offline'); },
  ]) assert.equal((await loadDiscussionComments('test-token', request)).status, 'unavailable');
});

test('text stays inert and malformed dates or external comment links are omitted', async () => {
  const bodyText = '<script>alert(1)</script>';
  const result = await loadDiscussionComments('test-token', async () => response([
    comment(1, { bodyText }), comment(2, { createdAt: 'bad date' }), comment(3, { url: 'javascript:alert(1)' }),
  ]));
  assert.equal(result.comments.length, 1);
  assert.equal(result.comments[0].bodyText, bodyText);
});
