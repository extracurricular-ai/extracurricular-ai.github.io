---
title: "Let Your AI Search the Cursor History You Already Have"
description: "Connect cursor-history-mcp 0.3.1 so your assistant can search existing Cursor conversations and trace earlier decisions to their sources."
pubDate: "2026-09-09"
author: "S2thend"
tags: ["cursor", "mcp", "ai-memory"]
locale: "en"
image: "/images/blog/cursor-history/cover_memory_editorial.png"
imageAlt: "Editorial illustration: a reader consults a page from an existing archive."
featured: false
---

Your next debugging session may need a decision buried in an old Cursor conversation. You do not have to record that conversation again to make it retrievable.

`cursor-history-mcp` gives an MCP-capable assistant tools to search and inspect existing local Cursor history. Think of it as access to earlier evidence: the assistant can find a past discussion when needed. It does not automatically build a curated memory, inject every chat into every prompt, or guarantee that an old conclusion is still correct.

## Check the package boundary first

The public npm registry was rechecked on September 8, 2026: `cursor-history@0.18.0` is the CLI/library release, and `cursor-history-mcp@0.3.1` depends on reader 0.18.0. This patch updates the MCP SDK and dependencies while retaining the same reader coverage. Upgrade the MCP package itself when updating the server. Installing a global CLI does not change another package's dependency.

[Published MCP package metadata](https://registry.npmjs.org/cursor-history-mcp/0.3.1) · [Published CLI package metadata](https://registry.npmjs.org/cursor-history/0.18.0)

## Try local search before connecting an assistant

```bash
npx --yes cursor-history@0.18.0 search "jwt rotation"
```

If nothing is found, check the data roots and query in the [search guide](/en/blog/search-cursor-chat-history/). MCP cannot read files unavailable to its underlying reader.

## Connect the published MCP server

Use Node.js 20.x or 22.x–26.x on the machine where the local history is readable. For a client supporting local stdio MCP servers, merge this into its existing configuration:

```json
{
  "mcpServers": {
    "cursor-history": {
      "command": "npx",
      "args": ["-y", "cursor-history-mcp@0.3.1"]
    }
  }
}
```

The [MCP README](https://github.com/S2thend/cursor-history-mcp#quick-start) has client-specific setup instructions. If `npx` is not on the client's PATH, use its absolute executable path. Running the server starts a stdio process waiting for an MCP client, not an interactive history CLI.

## Ask for a retrieval workflow, not a guess

Try this prompt:

> Search my Cursor history for “refresh token”. Inspect the matching sessions by their exact UUIDs. Explain the earlier rotation decision, identify which session supports it, and distinguish that historical decision from what the current code does. Only read and search.

The assistant can search a distinctive phrase, inspect a candidate session, and cite the returned ID. If it searches within one workspace, keep that workspace scope on the read. A summary is more useful when you can trace it to the conversation that supports it.

## Why text search is a reasonable starting point

Error strings, symbols, endpoint paths, and package names often survive in conversation text exactly where they matter. The server's reader does case-insensitive text matching; it needs no embedding service or API key of its own.

Natural-language understanding comes from the assistant. It can reformulate a question into several search phrases, but the search tool itself is not a semantic retrieval engine. Large histories can take time to scan; no latency benchmark is claimed here.

## Local storage and model access are different boundaries

The reader operates on local files. Results returned through MCP are visible to the client and may be sent to its model provider. A locally running server is not an end-to-end offline assistant.

Retrieved chats can include old commands or private project content. Use them as reference material. Backup writes an archive; restore and migration modify history. For this search use case, keep the assistant to read operations. If you later choose migration, preview it and use copy mode when you want the original preserved.

With the upgraded reader, backup / restore remain Composer-only, and migration remains limited to eligible Composer sessions. Export returns available content; missing timestamps or tool results do not become complete merely because an assistant reads them.

## A useful form of long-term context

The value is a shorter path back to a concrete earlier decision: which experiment failed, which command helped, and what assumptions were made. Your history can inform the next session without becoming an unquestioned source of truth.

[MCP setup and release status](https://github.com/S2thend/cursor-history-mcp#quick-start) · [CLI / Node.js reader](https://github.com/S2thend/cursor-history)
