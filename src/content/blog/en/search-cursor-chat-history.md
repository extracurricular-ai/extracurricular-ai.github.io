---
title: "How to Search Cursor Chat History Across Workspaces"
description: "Search existing Cursor conversations across workspaces, inspect results by session UUID, and export the history you need with a local CLI."
pubDate: "2026-09-09"
author: "S2thend"
tags: ["cursor", "search", "cli"]
locale: "en"
image: "../../../assets/blog/cursor-history/cover_search_editorial.png"
imageAlt: "Editorial illustration: a lens examines conversation pages across project folders."
featured: false
---

You remember fixing the authentication bug. You cannot remember which project contained the conversation.

`cursor-history` searches conversation text in supported local Cursor stores across discovered workspaces. It can read history created before you installed it, without a capture hook, embeddings, or an API key.

## Start with a phrase you remember

```bash
npm install -g cursor-history
cursor-history list --all
cursor-history search "connection pool"
```

Run this on the machine where the history is stored, using Node.js 20.x or 22.x–26.x. The CLI searches parsed message content using case-insensitive text matching. It does not semantically infer that “database saturation” means “connection pool.”

Try a distinctive substring if a broad query returns too much:

```bash
cursor-history search "ECONNRESET" -n 30
cursor-history search "oauth callback"
cursor-history search "refreshToken"
```

Search returns up to 10 matching sessions by default. `-n 30` raises the limit; `-n 0` returns all matching sessions. `list --all` removes the listing limit; it is not a switch that enables global search. Search covers discovered workspaces by default unless you select a workspace.

## Open the session that actually matched

For interactive use, copy the session index displayed in the result. If it is `12`:

```bash
cursor-history show 12
cursor-history export 12
```

The number refers to the underlying session list within the same data roots and workspace scope. It is not the search result's ordinal position. New sessions can also change list indices, so use exact UUIDs for saved commands.

With `jq` installed, retrieve those UUIDs directly:

```bash
cursor-history search "authentication" --json   | jq -r '.results[].sessionId'
```

Copy a returned ID into these commands, replacing the placeholder:

```bash
session_id='PASTE_RETURNED_SESSION_UUID'
cursor-history show "$session_id"
cursor-history export "$session_id" --format json --output ./conversation.json
```

The JSON export contains the available session representation. It may include source details and inferred timestamps; it is not proof of a complete original conversation.

## Narrow the workspace when you know it

Keep the same scope on the follow-up read:

```bash
cursor-history --workspace /absolute/path/to/project search "authentication"
cursor-history --workspace /absolute/path/to/project show 1
```

Here `1` means session 1 in that workspace's list. Do not reuse a global index in a workspace-scoped read. A workspace filter also limits which conversation sources may be opened; it is more than a display filter.

## If you get no useful matches

| Check | Why it matters |
|---|---|
| Try a shorter phrase or exact error token | Text search does not paraphrase the query |
| Run `cursor-history list --all --json` | Inspect discovered sessions and any diagnostics |
| Check which machine and user account owns the files | Local search does not fetch SSH, cloud, or another user's history |
| Check custom roots or WSL paths | Composer data and `~/.cursor` can live in different environments |
| Review source status | Missing, partial, or ambiguous sources can affect what is searchable |

For an explicit environment, set both roots to the intended directories:

```bash
CURSOR_DATA_PATH='/absolute/path/to/Cursor/User/workspaceStorage' CURSOR_STORE_ROOT='/absolute/path/to/.cursor' cursor-history search "authentication"
```

The [platform guide](https://github.com/S2thend/cursor-history#where-cursor-stores-data) explains these selectors. An empty result means no match was returned from the readable selected sources; it does not prove that a chat was deleted.

## When to use Cursor's own commands

To continue an Agent CLI conversation, start with Cursor's [native session commands](https://cursor.com/docs/cli/reference/parameters). This workflow is useful when you need to locate text across local conversations and then inspect or export the result.

The [MCP companion](https://github.com/S2thend/cursor-history-mcp#quick-start) can let an assistant perform the search. As checked on September 8, 2026, MCP 0.3.1 uses reader 0.18.0. The packages release independently, so update the MCP package when upgrading the server.

If the search finds something useful, [keep cursor-history on GitHub](https://github.com/S2thend/cursor-history). For moved projects, continue with [the recovery guide](/en/blog/recover-moved-cursor-project-chats/).

Implementation references: [search traversal](https://github.com/S2thend/cursor-history/blob/3558ed86842d0beec8660abbb955ec9910720bc1/src/core/storage.ts), [text matcher](https://github.com/S2thend/cursor-history/blob/3558ed86842d0beec8660abbb955ec9910720bc1/src/core/parser.ts), [CLI JSON formatter](https://github.com/S2thend/cursor-history/blob/3558ed86842d0beec8660abbb955ec9910720bc1/src/cli/formatters/json.ts).
