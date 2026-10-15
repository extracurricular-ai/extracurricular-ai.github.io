---
title: "Moved or Renamed a Cursor Project? Your Old Chats May Still Be on Disk"
description: "Find surviving Cursor conversations after moving or renaming a project, then choose an export, eligible Composer copy, or backup restore."
pubDate: "2026-09-09"
author: "S2thend"
tags: ["cursor", "recovery", "backup"]
locale: "en"
image: "../../../assets/blog/cursor-history/cover_recovery_editorial.png"
imageAlt: "Editorial illustration: a moved folder and an older archive worth checking."
featured: false
---

You move `~/code/payments-api` to `~/work/payments-api`, reopen Cursor, and the old chats are missing from the sidebar.

That does not tell you whether the underlying history was deleted. Workspace associations and local indexes can make a conversation hard to find after a path change. Start by locating the data; decide how to recover it after you know which source remains.

This guide uses `cursor-history` 0.18.0. **It can export supported readable sessions, but backup / restore cover Composer databases only. Migration accepts eligible Composer sessions and refuses Store-only, merged-source, and ambiguous sessions.** [Compatibility details](https://github.com/S2thend/cursor-history/blob/3558ed86842d0beec8660abbb955ec9910720bc1/docs/compatibility.md).

## 1. Preserve the source before changing history

Install the tool if needed:

```bash
npm install -g cursor-history
cursor-history backup
```

Keep the archive path printed by `backup`. This archive does **not** contain `store.db` files or Agent transcripts. For those sources, keep a separate filesystem backup of the relevant roots with the writing application closed. Do not treat a copied live SQLite main file as a complete snapshot of pending WAL data.

## 2. Find the old conversation

```bash
cursor-history list --workspaces
cursor-history list --all
cursor-history search "payment retry"
cursor-history search "payment retry" --json
```

Copy the exact `sessionId` from a matching JSON result. The sample below is a placeholder, not a real chat ID:

```bash
session_id='PASTE_RETURNED_SESSION_UUID'
cursor-history show "$session_id" --json
cursor-history export "$session_id" --format json --output ./recovered-conversation.json
```

This step recovers a readable export when the source supports it. It does not promise that Cursor can resume the conversation or reconstruct every tool state.

If there are no matches, verify the original machine, OS user, custom data roots, and WSL environment. The tool does not undelete erased databases or retrieve cloud-only conversations.

## 3. Preview a copy for an eligible Composer session

Open the destination project in Cursor once so its workspace exists, then close Cursor before changing history. Use the ID already inspected:

```bash
cursor-history migrate-session "$session_id" /absolute/path/to/new/workspace   --copy --dry-run
```

Check the reported source, session, and destination. If the preview refuses the source representation or reports ambiguity, retain the export and investigate; do not treat a forced write as a recovery method.

If the preview is correct, copy it:

```bash
cursor-history migrate-session "$session_id" /absolute/path/to/new/workspace --copy
```

`--copy` keeps the original session. The default without it is **move**, which removes the original. Reopen the destination workspace and verify the result in your actual Cursor version. A successful tool operation is not a guarantee of every current sidebar or resume behavior.

## 4. Inspect a Composer archive before restoring it

You can read a supported backup directly:

```bash
cursor-history list --backup /absolute/path/to/backup.zip --all
cursor-history search "payment retry" --backup /absolute/path/to/backup.zip
```

To inspect restoration in a separate destination, use a new, empty directory:

```bash
cursor-history restore /absolute/path/to/backup.zip   --target /absolute/path/to/empty-recovery/workspaceStorage
```

This writes restored Composer data to the chosen root; it does not import a Markdown or JSON export. Live restoration requires deliberate destination selection and a separate backup of existing data. The [backup and restore guide](https://github.com/S2thend/cursor-history#backup--restore) documents collisions and integrity checks.

## Before moving machines

Keep the Composer archive, separate Store / transcript filesystem backups, and exports of conversations you particularly care about. Preserve the original until you have verified the new environment.

“Missing from the sidebar” is a useful symptom, not a diagnosis. Locate the surviving source first, then choose between a readable export, a supported Composer copy, and a restore.

[Get cursor-history](https://github.com/S2thend/cursor-history) · [Search workflow](/en/blog/search-cursor-chat-history/)
