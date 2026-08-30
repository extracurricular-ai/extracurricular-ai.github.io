import { GITHUB_ORG, GITHUB_ORG_NAME, HIDDEN_REPOS, MAX_TOPICS } from '../config';
import { t } from '../i18n/index';

export interface Project {
  name: string;
  /** Repo name as it appears on GitHub, used to look up an i18n description override. */
  slug: string;
  description: string | null;
  href: string;
  stars: number;
  topics: string[];
  language: string | null;
  status: 'live' | 'in-progress';
}

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  topics: string[];
  language: string | null;
  archived: boolean;
  fork: boolean;
  private: boolean;
}

/**
 * Shown when the GitHub API can't be reached at build time. Keeping the site
 * buildable offline matters more than the list being complete — a failed fetch
 * should degrade the projects page, not break the deploy.
 */
const FALLBACK: Project[] = [
  {
    name: 'open-deep-research-with-web-ui',
    slug: 'open-deep-research-with-web-ui',
    description: null,
    href: `${GITHUB_ORG}/open-deep-research-with-web-ui`,
    stars: 0,
    topics: ['python', 'llm', 'deep-research'],
    language: 'Python',
    status: 'live',
  },
];

function toProject(repo: GitHubRepo): Project {
  return {
    // The repo name as-is. Auto-titleizing mangles acronyms and existing casing
    // ("Web Ui", "Dsh"), so a nicer label comes from an i18n Name override.
    name: repo.name,
    slug: repo.name,
    description: repo.description,
    href: repo.html_url,
    stars: repo.stargazers_count,
    topics: (repo.topics ?? []).slice(0, MAX_TOPICS),
    language: repo.language,
    // Archived repos are done being worked on, so they read as reference rather
    // than as something you can jump into today.
    status: repo.archived ? 'in-progress' : 'live',
  };
}

/**
 * Resolve the name and blurb we actually render for a repo: a hand-written
 * translation wins where we have one, otherwise we fall back to what GitHub
 * already knows, so a new repo shows up without needing a code change.
 */
export function localize(project: Project, locale: string): Project {
  return {
    ...project,
    name: t(locale, `projects.${project.slug}Name`, project.name),
    description: t(
      locale,
      `projects.${project.slug}Description`,
      project.description ?? t(locale, 'projects.noDescription'),
    ),
  };
}

/**
 * Fetched at build time, so the published pages are static HTML with no client
 * JS and no per-visitor API calls. Re-run the build to pick up changes made on
 * GitHub — the deploy workflow does this on a daily schedule.
 */
export async function fetchProjects(): Promise<Project[]> {
  const url = `https://api.github.com/orgs/${GITHUB_ORG_NAME}/repos?per_page=100&sort=updated`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'exai-website-build',
  };

  // Present in GitHub Actions; lifts the rate limit from 60/hr to 1000/hr.
  // Absent locally, where the unauthenticated limit is plenty for one build.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[github] ${res.status} ${res.statusText} — falling back to static project list`);
      return FALLBACK;
    }

    const repos = (await res.json()) as GitHubRepo[];
    const projects = repos
      .filter((r) => !r.private && !r.fork && !HIDDEN_REPOS.has(r.name))
      .map(toProject)
      // Most-starred first: the flagship projects should lead the page, and
      // recency ordering buries them whenever a small repo gets a commit.
      .sort((a, b) => b.stars - a.stars);

    if (projects.length === 0) {
      console.warn('[github] org returned no public repos — falling back to static project list');
      return FALLBACK;
    }

    console.log(`[github] loaded ${projects.length} public repos`);
    return projects;
  } catch (err) {
    console.warn(`[github] fetch failed (${err instanceof Error ? err.message : err}) — falling back to static project list`);
    return FALLBACK;
  }
}
