# DSH content provenance and release checklist

Prepared 2026-09-09. Four Markdown articles form two en/zh translation pairs:

- `/en/blog/dsh-rewind-restore-files/` and `/zh/blog/dsh-rewind-restore-files/`
- `/en/blog/dsh-rewind-plugin-comparison/` and `/zh/blog/dsh-rewind-plugin-comparison/`

The production origin is `https://extracurricular.ai`. These are intended routes, not a claim that deployment has happened.

## Evidence

Documentation and selected shipped-code review; no fresh DSH end-to-end or competitor performance test. Source packages were fetched from the public npm registry without executing package code. Article links pin source commits reported by npm's gitHead. Preserve the review date; recheck package and host versions before changing behavioral claims.

| npm release | gitHead | tarball SHA-256 |
|---|---|---|
| dsh-filesnap 0.2.2 | 857481528bd17c2ea5434c8d358ad6ede7f8b844 | 9fa5148eb5d9f5b59e6e86a5de075cd073a42b8c797d841621914bd97dcd4cf8 |
| dsh-rewind-plugin 0.9.1 | c059e38ceb8e3da087387bcb808796461aa6064c | 7916021046a75061bec92310a1f76daffe0a0629ab2e3daadb70b45b419ae8dc |
| dsh-rewind 0.11.12 | 9b2ce54b83a89c60f7d31be5c28013b41040b360 | f2d75aa35ce0bfaf9a345467daba57a9d68d5065df1ef32afc2c54f5a75e1ac3 |

For each package, registry manifest is `https://registry.npmjs.org/<package>/<version>` and tarball is `https://registry.npmjs.org/<package>/-/<package>-<version>.tgz`.

FileSnap: README, architecture and troubleshooting; selected command/client code informs the typed-command navigation distinction. SiriLee: README.en.md, docs/compat/tracking-boundary.md, docs/snapshot-auto-cleanup.md and selected lib/index.js. LJH-dot: README.md and selected lib/index.js. Do not reuse the earlier 0.4.2 audit as a finding about 0.9.1.

## Images

Six original screenshots reused with project owner's authorization from dsh-filesnap/assets/shot-*.png. They show an existing 0.2.2 session on a DSH 0.1.2-rc.1 local build, not a newly performed test. Test-directory paths and session identifiers remain visible; no credentials were observed. English UI is retained in both languages, with localized alternative text and explanatory prose.

The blue/white anime whale-girl cover was generated with the built-in imagegen tool; see [generation prompt](dsh-whale-girl-cover.md). A 1280 × 640 JPEG export is shared by the blog and README. The two localized flow diagrams are original native SVG, depicting conversation forks that share a physical workspace; they are not screenshots.

## Validation

- Astro production build generated 37 pages, including all four new article routes.
- Build used the site's existing static project-list fallback because GitHub was unreachable in the restricted environment.
- New article local links and image paths checked against the generated output.
- Playwright checked all four articles at 390 px and 1440 px: no page overflow or broken images; canonical URLs and en/zh hreflang alternatives present. Desktop, mobile and mobile-table screenshots visually inspected.
- No deployment, push, external issue or email performed as part of authoring.

Before publishing, review prose and source links, then use the repository's normal deployment workflow. After publishing, open both language routes, check the cover and install commands, and record actual publication URLs in the promotion tracker. A successful local build is not a search-indexing result.
