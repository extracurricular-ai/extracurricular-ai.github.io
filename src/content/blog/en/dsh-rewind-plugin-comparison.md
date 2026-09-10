---
title: "DSH rewind plugins compared: in-place rewind, forks, file recovery, and redo"
description: "Compare dsh-filesnap, SiriLee’s dsh-rewind-plugin, and LJH-dot’s dsh-rewind by conversation behavior, undoing a rewind, file coverage, and Git requirements."
pubDate: "2026-09-09"
author: "ExAI Team"
tags: ["DeepSeek Harness", "rewind", "dsh-filesnap", "comparison"]
locale: "en"
image: "/images/blog/dsh-rewind/cover-rewind-redo.jpg"
imageWidth: 1280
imageHeight: 640
imageAlt: "DSH Rewind & Redo by FileSnap, with a blue and white anime whale-girl mascot"
---

Choosing a **DeepSeek Harness rewind plugin** starts with two questions: do you want to stay in the same conversation, and do you need to reverse the rewind itself? File coverage and recovery boundaries matter just as much as the command name.

[中文版本](/zh/blog/dsh-rewind-plugin-comparison/) · [FileSnap installation tutorial](/en/blog/dsh-rewind-restore-files/)

**Disclosure and method:** we maintain dsh-filesnap, displayed as **DSH Rewind & Redo — by FileSnap**. This comparison reviews versioned documentation and selected shipped code as of **September 9, 2026**. It is not a fresh end-to-end test or a performance benchmark. The claims below describe these releases, not every future release or every DSH host version.

## Choose by workflow

- **Stay in the same conversation, with conversation-only rewind available:** consider SiriLee's `dsh-rewind-plugin`. In the reviewed version, `/undo` opens rewind; it does not reverse a previous rewind.
- **Keep the original conversation and reverse a mistaken rewind:** consider `dsh-filesnap` and `/redo`. You continue in a child conversation sharing the same workspace, and captured sessions currently need the plugin installed to reopen.
- **Use Git-based snapshots with recovery of the latest rewind:** consider LJH-dot's `dsh-rewind` and `/unrewind`. Check its Git restore behavior and exclusion of untracked files first.

These recommendations follow the documented behavior of the releases below. The table and linked sources explain the tradeoffs; no overall winner is claimed from an unperformed hands-on test.

## First, distinguish the packages

Two projects have a repository called `dsh-rewind`, but their npm packages differ.

| Project | npm package | Reviewed version |
|---|---|---|
| [extracurricular-ai/dsh-filesnap](https://github.com/extracurricular-ai/dsh-filesnap) | `dsh-filesnap` | [0.2.2](https://registry.npmjs.org/dsh-filesnap/0.2.2) |
| [SiriLee/dsh-rewind](https://github.com/SiriLee/dsh-rewind) | `dsh-rewind-plugin` | [0.9.1](https://registry.npmjs.org/dsh-rewind-plugin/0.9.1) |
| [LJH-dot/dsh-rewind](https://github.com/LJH-dot/dsh-rewind) | `dsh-rewind` | [0.11.12](https://registry.npmjs.org/dsh-rewind/0.11.12) |

The primary sources for the behavior table are each release's documentation: [FileSnap](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md), [SiriLee](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md), and [LJH-dot](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md).

## Compare the behavior you will notice

| Question | dsh-filesnap 0.2.2 | dsh-rewind-plugin 0.9.1 | dsh-rewind 0.11.12 |
|---|---|---|---|
| Where do I continue? | A child conversation; original retained | Same conversation, visible history rewound | Active conversation rewound; recovery data kept in a vault |
| Can I reverse the rewind? | `/redo` in the child | No built-in reversal documented; `/undo` is a rewind alias | `/unrewind` restores the latest rewind |
| Conversation-only mode? | Main rewind couples conversation and tracked files | Yes; picker also offers conversation + code | Yes; conversation/code flags available |
| How is the target selected? | Explicit displayed turn or point ID | Interactive rewind picker | Relative number; `1` means latest |
| Git required? | No | No | Uses Git snapshots; initializes a baseline when needed |
| What is the file boundary? | Known paths, observed filesystem writes, bounded recent scan | Registered write-tool paths and rescans of already tracked files | Git-based working-tree snapshots; untracked files excluded |

“Conversation and files together” and “no Git required” are shared capabilities of FileSnap and SiriLee's plugin. They are not unique FileSnap claims.

## When in-place rewind is the better fit

SiriLee's plugin is a reasonable fit when you want to select an earlier message, stay in the same conversation, and optionally rewind only the conversation. Its visible-history change uses a marker in an append-only log. **In-place does not mean the raw audit trail is erased.**

Version 0.9.1 documents `/undo` as another way to open rewind. It does not document that command as undoing a previous rewind, and the README describes rewind as non-reversible through the built-in workflow. That is a property of this implementation; in-place designs can support recovery, as LJH-dot's `/unrewind` illustrates. [SiriLee README](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md), [LJH-dot README](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md).

## When a retained branch and redo are useful

Choose FileSnap when you want to keep the original conversation and have a direct way to reverse a mistaken rewind. A practical example is recovering a deleted file, realizing you chose a point too early, and using `/redo` before trying another point.

![FileSnap preserves the original conversation and creates a child while restoring one shared workspace](/images/blog/dsh-rewind/rewind-flow-en.svg)

The cost is another conversation. The browser rewind action opens the child; the typed command returns a session to open. Also, **both conversations use the same workspace directory**. Preserving the original transcript does not preserve an independently editable copy of its files.

![FileSnap redo output names the original conversation as the continuation target](/images/blog/dsh-rewind/shot-6-redo.png)

FileSnap 0.2.2 has a significant uninstall limitation: captured sessions need its event registration to open, so removing the plugin requires reinstalling it before reopening those sessions. Source startup via `pnpm dsh` can hit the same registration problem. There is no per-file restore picker in this release. These costs belong in the decision alongside redo. [FileSnap documentation](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md).

## File coverage can decide the choice

SiriLee documents a boundary around files first seen through supported write tools. Rescans help with subsequent changes to registered files, but a first shell edit to an unregistered path is outside that mechanism. Its [tracking-boundary documentation](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/docs/compat/tracking-boundary.md) also explains snapshot timing limits.

FileSnap adds a bounded recent-change scan and can track observed filesystem writes outside the project root. That expands the intended coverage; it does not promise every shell-created file or an unlimited filesystem backup. Check `/rewind status`, `.filesnapignore`, and the target snapshot. Its [architecture documentation](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/docs/architecture.md) describes these boundaries.

LJH-dot's plugin uses Git operations for capture and restore. Its documented scope includes working-tree changes made outside DSH, while excluding untracked files. This may suit a Git-centered workflow, but it is a different recovery boundary from “all files on disk.” [LJH-dot documentation](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md).

## Check compatibility and maintenance before adopting

SiriLee 0.9.1 includes instructions for users upgrading DSH to 0.1.3 and a repair path for older rewind markers. It also documents optional snapshot cleanup. Read the release's [upgrade instructions](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md) and [cleanup guide](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/docs/snapshot-auto-cleanup.md). A host upgrade is a reason to recheck behavior, not to reuse an older audit verdict.

For SiriLee and LJH-dot, this review does not establish every uninstall or host-upgrade outcome. Verify those paths in a disposable session before relying on them. For all three, record the plugin version and host version, then test the files your workflow actually changes—including untracked files, binary assets, and shell edits if you use them. Binary round-trip behavior was not independently exercised for this article.

If FileSnap matches your workflow, the [illustrated tutorial](/en/blog/dsh-rewind-restore-files/) covers installation, explicit target selection, the child conversation, and `/redo`.
