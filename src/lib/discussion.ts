import { COMMUNITY_REPO_NAME, COMMUNITY_DISCUSSION_NUMBER, COMMUNITY_DISCUSSION_URL, GITHUB_ORG_NAME } from '../config.ts';

export interface DiscussionComment {
  id: string;
  url: string;
  bodyText: string;
  createdAt: string;
  author: { login: string; avatarUrl: string; url: string } | null;
}

interface CommentNode extends DiscussionComment { isMinimized: boolean }
interface CommentConnection {
  nodes: (CommentNode | null)[];
  pageInfo: { hasPreviousPage: boolean; startCursor: string | null };
}
export interface DiscussionSnapshot {
  status: 'ready' | 'unavailable';
  comments: DiscussionComment[];
  fetchedAt?: string;
}

const query = `query CommunityComments($owner: String!, $name: String!, $number: Int!, $before: String) {
  repository(owner: $owner, name: $name) {
    discussion(number: $number) {
      comments(last: 20, before: $before) {
        nodes { id url bodyText createdAt isMinimized author { login avatarUrl url } }
        pageInfo { hasPreviousPage startCursor }
      }
    }
  }
}`;

/** Server/build time only. Never serialize credentials into page props. */
export async function loadDiscussionComments(token?: string, request: typeof fetch = fetch): Promise<DiscussionSnapshot> {
  const unavailable: DiscussionSnapshot = { status: 'unavailable', comments: [] };
  if (!token) return unavailable;
  try {
    const comments = new Map<string, DiscussionComment>();
    const signal = AbortSignal.timeout(10_000);
    let before: string | null = null;
    do {
      const response = await request('https://api.github.com/graphql', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'exai-website-build' },
        body: JSON.stringify({ query, variables: { owner: GITHUB_ORG_NAME, name: COMMUNITY_REPO_NAME, number: COMMUNITY_DISCUSSION_NUMBER, before } }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { errors?: unknown[]; data?: { repository?: { discussion?: { comments?: CommentConnection } } } };
      const connection = payload.data?.repository?.discussion?.comments;
      if (payload.errors?.length || !connection || !Array.isArray(connection.nodes)) throw new Error('Discussion data unavailable');
      for (const comment of connection.nodes) {
        if (!comment || comment.isMinimized || !comment.bodyText.trim()) continue;
        // Only render links to this discussion, and use text rather than GitHub HTML.
        if (!comment.url.startsWith(`${COMMUNITY_DISCUSSION_URL}#discussioncomment-`) || !Number.isFinite(Date.parse(comment.createdAt))) continue;
        const { isMinimized: _, ...publicComment } = comment;
        comments.set(comment.id, publicComment);
      }
      if (comments.size >= 5 || !connection.pageInfo.hasPreviousPage) break;
      const cursor = connection.pageInfo.startCursor;
      if (!cursor || cursor === before) throw new Error('Invalid pagination cursor');
      before = cursor;
    } while (!signal.aborted);
    if (signal.aborted) throw new Error('Request timed out');
    return { status: 'ready', comments: [...comments.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5), fetchedAt: new Date().toISOString() };
  } catch {
    console.warn('[discussion] Comments could not be loaded; keeping the GitHub discussion link available.');
    return unavailable;
  }
}

let snapshot: Promise<DiscussionSnapshot> | undefined;
export function fetchDiscussionComments(): Promise<DiscussionSnapshot> {
  return snapshot ??= loadDiscussionComments(process.env.GITHUB_TOKEN);
}
