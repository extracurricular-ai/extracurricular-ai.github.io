# Homepage community discussion

The homepage points to [Discussion #1](https://github.com/extracurricular-ai/extracurricular-ai.github.io/discussions/1). Visitors can compose a message locally, then explicitly copy it and navigate to GitHub's comment section to paste and publish it. The site does not submit comments or authenticate visitors. No draft text is placed in the URL. If clipboard access fails, the text is selected for manual copying and the GitHub link remains available.

`src/lib/discussion.ts` reads the newest five visible top-level comments through GitHub's authenticated GraphQL API at build time, paging backward past minimized comments. The snapshot is shared across locales. Author names, avatars, timestamps, plain text excerpts and original comment links are rendered into static HTML. Replies are read on GitHub. No access token is sent to the browser.

The existing Pages workflow grants `discussions: read` to its `GITHUB_TOKEN`. Comment creation, edits and deletion in Discussion #1 trigger a rebuild and deployment; the existing daily schedule also refreshes the snapshot. Changes appear after the deployment finishes and the visitor reloads the page. This is a build-time snapshot, not a live feed. These event hooks take effect once the workflow reaches the repository's default branch.

Local builds without `GITHUB_TOKEN`, or API failures, show an unavailable message and direct GitHub links. This is separate from a successfully fetched discussion with no comments. For a live local snapshot, provide a token with read access to this repository's discussions in the build environment; never add it to source or a public environment variable.

Validation:

```sh
node --experimental-strip-types tests/discussion.test.mjs
pnpm build
```

References: [GitHub Discussions GraphQL API](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions), [discussion comment workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#discussion_comment), [workflow token permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions).
