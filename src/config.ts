export const GITHUB_ORG_NAME = 'extracurricular-ai';
export const GITHUB_ORG = `https://github.com/${GITHUB_ORG_NAME}`;
export const COMMUNITY_REPO_NAME = 'extracurricular-ai.github.io';
export const COMMUNITY_DISCUSSION_NUMBER = 1;
export const COMMUNITY_DISCUSSION_URL = `${GITHUB_ORG}/${COMMUNITY_REPO_NAME}/discussions/${COMMUNITY_DISCUSSION_NUMBER}`;
export const GITHUB_REPO = `${GITHUB_ORG}/open-deep-research-with-web-ui`;
export const GITHUB_REPO_DISCUSSIONS = `${GITHUB_REPO}/discussions`;
export const GITHUB_REPO_ISSUES = `${GITHUB_REPO}/issues`;

/**
 * Repos that exist for org plumbing rather than as projects worth showing:
 * the org profile repo, and this site itself.
 */
export const HIDDEN_REPOS = new Set([
  '.github',
  `${GITHUB_ORG_NAME}.github.io`,
]);

/** Cap on topic pills per card, so a heavily-tagged repo doesn't blow out the layout. */
export const MAX_TOPICS = 5;
