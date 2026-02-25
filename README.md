[English](README.md) | [中文](README_zh-CN.md)

# eForest Agent Skills

[![Unit Tests](https://github.com/eforest-finance/eforest-agent-skills/actions/workflows/publish.yml/badge.svg)](https://github.com/eforest-finance/eforest-agent-skills/actions/workflows/publish.yml)
[![Coverage](https://codecov.io/gh/eforest-finance/eforest-agent-skills/graph/badge.svg)](https://codecov.io/gh/eforest-finance/eforest-agent-skills)

AI Agent Kit for aelf + eForest capabilities, exposed via CLI, MCP Server, and SDK.

## Business Capability Overview

### Symbol-Market Domain

- Check name availability and estimate costs before action
- Purchase symbol creation entitlement (SEED)
- Create NFT / FT assets
- Issue assets to target addresses
- Provide dry-run preview, risk prompts, and structured failure feedback

### Forest Domain (key NFT capabilities)

- Create NFT collections and items (single or batch)
- NFT trading workflows: list, buy, offer, deal, cancel
- NFT asset operations: transfer and price lookup
- Optional extensions: drop, whitelist, AI, miniapp, profile, discovery, realtime

## What's New (Forest Skillization v1)

1. Expanded from token-only flows to a broader capability set for symbol creation plus NFT operations.
2. Unified skill input/output style so integrations and collaboration are easier across teams.
3. Improved failure feedback and maintenance-state handling, reducing disruption to main user flows.
4. Organized Forest capabilities into P0/P1/P2 tiers for phased rollout and acceptance.
5. Kept legacy tools available so migration can happen step by step without breaking existing usage.

## Forest Skills (P0 / P1 / P2)

### P0 (Core Trading Loop)

Workflow:
- `aelf-forest-create-collection`
- `aelf-forest-create-item`
- `aelf-forest-batch-create-items`
- `aelf-forest-list-item`
- `aelf-forest-buy-now`
- `aelf-forest-make-offer`
- `aelf-forest-deal-offer`
- `aelf-forest-cancel-offer`
- `aelf-forest-cancel-listing`
- `aelf-forest-transfer-item`
- `aelf-forest-get-price-quote`

Method (Contract):
- `aelf-forest-contract-market`
- `aelf-forest-contract-multitoken`
- `aelf-forest-contract-token-adapter`
- `aelf-forest-contract-proxy`

Method (API):
- `aelf-forest-api-market`
- `aelf-forest-api-nft`
- `aelf-forest-api-collection`
- `aelf-forest-api-sync`
- `aelf-forest-api-seed-auction`

### P1 (Growth)

Workflow:
- `aelf-forest-issue-item`
- `aelf-forest-place-bid`
- `aelf-forest-claim-drop`
- `aelf-forest-query-drop`
- `aelf-forest-whitelist-read`
- `aelf-forest-whitelist-manage`

Method (Contract):
- `aelf-forest-contract-auction`
- `aelf-forest-contract-drop`
- `aelf-forest-contract-whitelist`

Method (API):
- `aelf-forest-api-drop`
- `aelf-forest-api-whitelist`

### P2 (Extensions)

Workflow:
- `aelf-forest-ai-generate`
- `aelf-forest-ai-retry`
- `aelf-forest-create-platform-nft`
- `aelf-forest-miniapp-action`
- `aelf-forest-update-profile`
- `aelf-forest-query-collections`
- `aelf-forest-watch-market-signals`

Method (Contract):
- `aelf-forest-contract-miniapp`

Method (API):
- `aelf-forest-api-ai`
- `aelf-forest-api-platform`
- `aelf-forest-api-miniapp`
- `aelf-forest-api-user`
- `aelf-forest-api-system`
- `aelf-forest-api-realtime`

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- An aelf wallet private key (EOA) or Portkey CA wallet credentials

### Install

```bash
git clone https://github.com/eforest-finance/eforest-agent-skills.git
cd eforest-agent-skills
bun install
```

### Configure

```bash
cp .env.example .env
# Edit .env and set wallet credentials
```

### CLI Usage (Legacy)

```bash
# Check SEED price (dry-run)
bun run cli buy-seed --symbol MYTOKEN --issuer <your-address> --dry-run

# Buy SEED (max 2 ELF)
bun run cli buy-seed --symbol MYTOKEN --issuer <your-address> --force 2

# Create token on tDVV side chain
bun run cli create-token \
  --symbol MYTOKEN --token-name "My Token" \
  --seed-symbol SEED-321 \
  --total-supply 100000000 --decimals 8 \
  --issue-chain tDVV

# Issue tokens
bun run cli issue-token \
  --symbol MYTOKEN --amount 10000000000000000 \
  --to <recipient-address> --chain tDVV
```

## MCP Server (Claude Desktop / Cursor)

One-command setup:

```bash
# Claude Desktop
bun run setup claude

# Cursor IDE (project-level)
bun run setup cursor

# Cursor IDE (global)
bun run setup cursor --global

# Check status
bun run setup list
```

The MCP server auto-registers both legacy tools and all `aelf-forest-*` tools from the skill registry.

### Manual MCP Config

**EOA mode**:

```json
{
  "mcpServers": {
    "eforest-token": {
      "command": "bun",
      "args": ["run", "/path/to/eforest-agent-skills/src/mcp/server.ts"],
      "env": {
        "AELF_PRIVATE_KEY": "your_private_key",
        "EFOREST_NETWORK": "mainnet"
      }
    }
  }
}
```

**CA mode**:

```json
{
  "mcpServers": {
    "eforest-token": {
      "command": "bun",
      "args": ["run", "/path/to/eforest-agent-skills/src/mcp/server.ts"],
      "env": {
        "PORTKEY_PRIVATE_KEY": "your_manager_private_key",
        "PORTKEY_CA_HASH": "your_ca_hash",
        "PORTKEY_CA_ADDRESS": "your_ca_address",
        "EFOREST_NETWORK": "mainnet"
      }
    }
  }
}
```

## Forest API Route Map (Config-first)

Method API skills use route mapping from environment variables (no hard-coded route switch):

- `EFOREST_FOREST_API_ACTION_MAP_JSON` (preferred)
- `FOREST_API_ACTION_MAP_JSON` (fallback)

Example:

```json
{
  "aelf-forest-api-market": {
    "fetchTokens": {
      "method": "GET",
      "path": "/app/market/tokens",
      "auth": true
    }
  },
  "aelf-forest-api-sync": {
    "fetchSyncCollection": {
      "method": "POST",
      "path": "/app/nft/sync",
      "auth": true
    }
  }
}
```

## SDK Usage

```typescript
import {
  getNetworkConfig,
  dispatchForestSkill,
  listForestSkills,
} from '@eforest-finance/agent-skills';

const config = await getNetworkConfig({ env: 'mainnet' });

console.log('registered forest skills:', listForestSkills().length);

const quote = await dispatchForestSkill(
  'aelf-forest-get-price-quote',
  {
    env: 'mainnet',
    payload: {
      symbol: 'MY-NFT',
      include: ['tokenData', 'txFee'],
    },
  },
  { config },
);

if (!quote.success) {
  console.error(quote.code, quote.message);
} else {
  console.log(quote.data);
}
```

## Envelope & Error Contract

Successful response shape:

```json
{
  "success": true,
  "code": "OK",
  "data": {},
  "warnings": [],
  "traceId": "..."
}
```

Failure response shape:

```json
{
  "success": false,
  "code": "SERVICE_DISABLED",
  "message": "...",
  "maintenance": true,
  "retryable": false,
  "traceId": "...",
  "details": {}
}
```

## Service Gating & Graceful Degradation

### Key env vars

- `EFOREST_ENABLED_SERVICES`
- `EFOREST_DISABLED_SERVICES`
- `EFOREST_MAINTENANCE_SERVICES`
- `EFOREST_DISABLE_ALL_SERVICES`
- `EFOREST_SERVICE_<SERVICE_KEY_IN_UPPERCASE>`

Examples:

```bash
# Disable AI and miniapp domains
export EFOREST_DISABLED_SERVICES="forest.ai.*,forest.miniapp.*"

# Put market skills into maintenance mode
export EFOREST_MAINTENANCE_SERVICES="forest.market.*"

# Disable a specific service key
export EFOREST_SERVICE_FOREST_MARKET_WORKFLOW=false
```

## OpenClaw

### Initialize

```bash
# 1) Regenerate catalog from Forest registry (3 legacy + 45 Forest skills)
bun run generate:openclaw

# 2) Generate standalone OpenClaw config
bun run setup openclaw

# 3) Or merge into an existing OpenClaw config
bun run setup openclaw --config-path /path/to/openclaw.json
```

### Call Modes

- `structured` mode (12 high-frequency NFT skills): use direct parameters (symbol/price/chain/etc.).
- `inputJson` mode (33 long-tail Forest skills): pass one JSON object string for full input.

**Structured example** (`aelf-forest-list-item`):

```json
{
  "symbol": "NFT-1",
  "quantity": 1,
  "priceSymbol": "ELF",
  "priceAmount": 1.2,
  "durationJson": "{\"hours\":24}",
  "chain": "AELF",
  "env": "mainnet"
}
```

**inputJson example** (`aelf-forest-api-market`):

```json
{
  "inputJson": "{\"action\":\"fetchTokens\",\"params\":{\"chainId\":\"AELF\",\"page\":1}}",
  "env": "mainnet"
}
```

### Common Failure Codes

- `INVALID_PARAMS`: input mismatch with skill schema (missing fields/invalid enum/type).
- `SERVICE_DISABLED`: service key is disabled by environment switches.
- `MAINTENANCE`: service is under maintenance or route/config is unavailable.

Quick checks:
- verify parameters or `inputJson` shape
- verify `EFOREST_DISABLED_SERVICES` / `EFOREST_MAINTENANCE_SERVICES`
- verify `EFOREST_FOREST_API_ACTION_MAP_JSON` for method-api routes

## Architecture

```
eforest-agent-skills/
├── lib/
│   ├── types.ts
│   ├── config.ts
│   ├── aelf-client.ts
│   ├── api-client.ts
│   ├── forest-envelope.ts
│   ├── forest-service.ts
│   ├── forest-skill-registry.ts
│   ├── forest-schemas.ts
│   └── forest-validator.ts
├── src/
│   ├── cli/
│   │   └── forest_skill.ts
│   ├── core/
│   │   ├── seed.ts
│   │   ├── token.ts
│   │   ├── issue.ts
│   │   └── forest.ts
│   └── mcp/
│       └── server.ts
├── bin/
│   ├── setup.ts
│   ├── generate-openclaw.ts
│   └── platforms/
├── create_token_skill.ts
├── index.ts
├── openclaw.json
└── __tests__/
```

## Configuration Priority

Settings are resolved in this order (highest priority first):

1. Function params (SDK callers)
2. CLI args (`--env`, `--rpc-url`)
3. `EFOREST_*` / `AELF_*` environment variables
4. `.env` file
5. CMS remote config
6. Code defaults (`ENV_PRESETS`)

## Testing

```bash
bun test              # All tests
bun test:unit         # Unit tests only
bun test:integration  # Integration tests only
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AELF_PRIVATE_KEY` | aelf wallet private key (EOA mode) | — |
| `PORTKEY_PRIVATE_KEY` | Portkey Manager private key (CA mode) | — |
| `PORTKEY_CA_HASH` | Portkey CA hash (CA mode) | — |
| `PORTKEY_CA_ADDRESS` | Portkey CA address (CA mode) | — |
| `EFOREST_NETWORK` / `AELF_ENV` | `mainnet` or `testnet` | `mainnet` |
| `EFOREST_API_URL` / `AELF_API_URL` | Backend API URL | auto |
| `EFOREST_RPC_URL` / `AELF_RPC_URL` | AELF MainChain RPC | auto |
| `EFOREST_RPC_URL_TDVV` | tDVV RPC URL | auto |
| `EFOREST_RPC_URL_TDVW` | tDVW RPC URL | auto |
| `EFOREST_ENABLED_SERVICES` | Comma-separated service whitelist patterns | empty (allow all) |
| `EFOREST_DISABLED_SERVICES` | Comma-separated service disable patterns | empty |
| `EFOREST_MAINTENANCE_SERVICES` | Comma-separated maintenance patterns | empty |
| `EFOREST_DISABLE_ALL_SERVICES` | Disable all forest services (`true/false`) | `false` |
| `EFOREST_FOREST_API_ACTION_MAP_JSON` | Method-API action to route mapping JSON | empty |

## License

[MIT](LICENSE)
