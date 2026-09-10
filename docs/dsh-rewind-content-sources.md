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

## Search-readiness revision — 2026-09-09

Both comparison translations now lead with documented workflow-based recommendations after the disclosure. No hands-on result was added. The localized project pages link to the matching tutorial and comparison.

Added static sitemap and robots endpoints. The sitemap follows the existing localized canonical convention, including only existing translated posts and excluding root-level English aliases. It intentionally omits lastmod because a build is not evidence of a content change. If shared page routes change, update the sitemap's sharedPaths list.

Validation: production build succeeded; parsed XML contains 32 unique URLs matching all rendered canonical URLs, including all four DSH articles. Robots points to the sitemap; project links and comparison article local links resolve in generated output. Search Console inspection, live deployment checks and Google indexing remain outstanding.


## 2026-09-10: recorded demo edits

The user supplied separate English and Chinese 2560 × 1440 WebM recordings and matching M4A narration tracks. Each tutorial now embeds its own 20-second horizontal edit, original narration, poster and optional WebVTT voice captions. These are local files under `public/videos/dsh-rewind/`; no deployment was performed as part of video editing.

The edits omit waiting and exploratory steps, select original narration excerpts and hold the verified terminal result. They are a maintainer demonstration, not a speed benchmark or completion of the three-plugin R01–R06 protocol. `/redo` returns to the pre-rewind state, including deleting `data.txt` again in this example.

Reproducible source intervals, crop rectangles, audio selections and output validation are kept in the sibling `dsh-plugin-dev/dsh-filesnap-social-medias/video-work/` folder. Source recordings are unchanged.

Validation for the video embeds: Astro production build passed. Chromium played and sought both localized videos to 8.5 seconds at 1440 px and 390 px viewport widths, loaded all seven voice-caption cues per video, and found no horizontal overflow. Four final MP4 files passed complete decoding and duration/codec checks.


## Walkthrough revision: full frame and 1.5×

The user rejected the 20-second montage as too short and too tightly cropped. Its entries above describe an earlier iteration. The current tutorial embeds use full 2560 × 1440 horizontal recordings: Chinese 144.1 s and English approximately 148.77 s. Source audio and video share identical cuts and are both accelerated by exactly 1.5×. No spatial crop, zoom or held verification result is used in the walkthrough. Waiting and a small amount of repeated introduction are removed; action order and the extended rewind/redo explanation are retained. A 2.5-second installation card follows the demonstration.

The full edit decision list and removed intervals are recorded in `dsh-filesnap-social-medias/video-work/long-v2/plan.json`. Subtitles are cleaned for readability and correct ASR mistakes in product names, file names and v1/v2; they are not a word-for-word transcript. The original source recordings remain available. This revision was prepared locally, without publishing.

Walkthrough validation: all encoded segments match the planned frame counts; both complete files decode successfully. Chinese audio/video duration is 144.100 s; English video is 148.766667 s and audio 148.766 s. The Astro build passed. Desktop/mobile browser checks played both videos, sought to 90 s, loaded 74 Chinese / 43 English caption cues, and found no horizontal overflow.


## Platform video embeds — 2026-09-10

The user confirmed the English YouTube upload (`WPEXKesR_EM`) and publication of the Chinese Bilibili video (`BV1BiYT6qEjs`). The English tutorial now uses the YouTube iframe; the Chinese tutorial uses Bilibili's external player. Both retain direct viewing links for each language, full written instructions, and the accepted walkthrough descriptions. Earlier local MP4 files remain available; the tutorial HTML no longer loads them.

Both frames use lazy loading, autoplay disabled, accessible localized titles, full-screen permissions, and responsive 16:9 sizing with a 200px minimum height. `strict-origin-when-cross-origin` preserves the origin referrer used by embedded platforms. No custom player JavaScript is required.

References: https://developers.google.com/youtube/player_parameters and https://player.bilibili.com/ . Video publication is recorded from user confirmation; local layout validation does not establish third-party playback availability in every region.

Validation: final Astro build passed (37 pages). Chromium checked both language routes at 1440px, 390px, and 320px: exactly one iframe per tutorial, correct video IDs, no autoplay, full-screen enabled, direct links present, minimum 200px player height, and no page overflow. Third-party requests were blocked for these deterministic layout checks; external playback must be verified after deployment. No commit, push, or deployment was performed.


## 2026-09-10: entity clarification and deduplication comparison

The user supplied a Google AI conversation confusing the DSH plugin, the Rust engine, and an unrelated App Store application. Both tutorial translations now state the identities explicitly. Comparison pages add the FileSnap/SiriLee storage distinction, seven component-exercise results, exact versions, and links to reproducible evidence in the plugin repository. These links must be published in that repository before deploying this revision.

Artifacts: dsh-filesnap 0.2.2 and dsh-rewind-plugin 0.9.1 have the same SHA-256 values recorded above. Tested FileSnap engine: 0.4.0; Linux binary SHA-256 d933638cde3d8ac93c49fe9ed71859c1ba89c8cb011c648f82592b9362bbac23, matched to a fresh npm artifact. Source tag v0.4.0 resolves to commit 320c42877cd260f7dcd836f75c971785434af29d (annotated tag object: 225ac92b6adb28f06f8c1a4524d0362529583d60). filesnap 0.5.0 was observed in the registry but not used: the plugin depends on ^0.4.0.

Method: real FileSnap CLI, extracted shipped SnapshotStore with only its unused default-home resolver adapted; explicit temporary stores, 64 KiB ASCII payloads, hash/reference-resolution checks. Broader reuse is demonstrated; total storage savings, timing and DSH end-to-end behavior are not. The general R01–R06 suite remains unexecuted. Existing video embeds and user-confirmed publication URLs are preserved.


## Cross-assistant evidence — 2026-09-10

All four articles now describe Codex ancestry and the DSH/Pi standalone-engine integrations. Public manifests checked: pi-better-rewind-redo 0.1.1 depends on filesnap 0.5.0; dsh-filesnap 0.2.2 depends on ^0.4.0; codex-rewind 0.151.0-rewind.0 is a published distribution retaining an inlined codex-file-snapshots crate. The engine README explicitly identifies Codex as an ancestor rather than a consumer. Exact source links and review scope are recorded in the plugin repository docs/cross-assistant.md. Pi and Codex end-to-end tests were not rerun. Integration history supports an engineering-experience claim, not a measured reliability ranking.

Validation of this revision: Astro build generated 37 pages. The content cache reported duplicate IDs during synchronization; each final article route was generated once and its current text was verified. Chromium checked all four articles at 1440, 390 and 320 px (12 cases): no page overflow or broken images, correct canonical URLs, cross-assistant project names, comparison tables and preserved video IDs. External requests were blocked, so this is layout/content validation rather than a new platform playback test. No commit, push, deployment or external article update was performed.
