---
name: "eforest-agent-skills"
description: "eForest symbol and forest NFT operations for agent workflows."
---

# eForest Agent Skill

## When to use
- Use this skill when you need symbol lifecycle management and forest marketplace/NFT flows on aelf.

## Capabilities
- Symbol-market operations: buy seed, create token, issue token
- Forest operations: collection/item creation, listing, offer, trade
- Config-first service gating and graceful degradation
- Supports SDK, CLI, MCP, and OpenClaw integration from one codebase.

## Safe usage rules
- Never print private keys, mnemonics, or tokens in channel outputs.
- For write operations, require explicit user confirmation and validate parameters before sending transactions.
- Prefer `simulate` or read-only queries first when available.

## Command recipes
- Start MCP server: `bun run mcp`
- Run CLI entry: `bun run cli`
- Generate OpenClaw config: `bun run build:openclaw`
- Verify OpenClaw config: `bun run build:openclaw:check`
- Run CI coverage gate: `bun run test:coverage:ci`

## Limits / Non-goals
- This skill focuses on domain operations and adapters; it is not a full wallet custody system.
- Do not hardcode environment secrets in source code or docs.
- Avoid bypassing validation for external service calls.
