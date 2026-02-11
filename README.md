[English](README.md) | [中文](README_zh-CN.md)

# eForest Agent Skills

AI Agent Kit for aelf token lifecycle on [eForest](https://www.eforest.finance). Provides CLI, MCP Server, and SDK interfaces for:

- **buy-seed** — Purchase a SEED from the SymbolRegister contract
- **create-token** — Create a new FT token using an owned SEED (with cross-chain sync)
- **issue-token** — Issue tokens via Proxy ForwardCall

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- An aelf wallet private key with ELF balance

### Install

```bash
git clone https://github.com/eforest-finance/eforest-agent-skills.git
cd eforest-agent-skills
bun install
```

### Configure

```bash
cp .env.example .env
# Edit .env and set your AELF_PRIVATE_KEY
```

### CLI Usage

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

One-command setup for AI platforms:

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

Then edit the generated config to replace `<YOUR_PRIVATE_KEY>` with your actual key.

### Manual MCP Config

If you prefer manual configuration, add this to your MCP settings:

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

## OpenClaw

```bash
# Generate OpenClaw config with absolute paths
bun run setup openclaw

# Merge into existing config
bun run setup openclaw --config-path /path/to/openclaw.json
```

## SDK Usage

```typescript
import { buySeed, createToken, issueToken } from '@eforest-finance/agent-skills';
import { getNetworkConfig } from '@eforest-finance/agent-skills';

const config = await getNetworkConfig({ env: 'mainnet', privateKey: '...' });

const seedResult = await buySeed(config, {
  symbol: 'MYTOKEN',
  issueTo: config.walletAddress,
  force: 2,
});

const tokenResult = await createToken(config, {
  symbol: 'MYTOKEN',
  tokenName: 'My Token',
  seedSymbol: seedResult.seedSymbol!,
  totalSupply: '100000000',
  decimals: 8,
  issuer: config.walletAddress,
  issueChain: 'tDVV',
  isBurnable: true,
  tokenImage: '',
});
```

## Architecture

```
eforest-agent-skills/
├── lib/                  # Infrastructure layer
│   ├── types.ts          # Interfaces, constants, validators
│   ├── config.ts         # Network config & .env loader
│   ├── aelf-client.ts    # aelf-sdk wrapper
│   └── api-client.ts     # eForest backend API client
├── src/
│   ├── core/             # Pure business logic (no I/O side effects)
│   │   ├── seed.ts       # buySeed + parseSeedSymbolFromLogs
│   │   ├── token.ts      # createToken
│   │   └── issue.ts      # issueToken + encodeIssueInput
│   └── mcp/
│       └── server.ts     # MCP Server adapter (Zod validation)
├── bin/
│   ├── setup.ts          # Setup CLI entry point
│   └── platforms/        # Claude, Cursor, OpenClaw adapters
├── create_token_skill.ts # CLI adapter (thin wrapper)
├── index.ts              # SDK entry (re-exports)
├── openclaw.json         # OpenClaw tool definitions
└── __tests__/            # Unit + Integration tests
```

## Configuration Priority

Settings are resolved in this order (highest priority first):

1. Function params (SDK callers)
2. CLI args (`--env`, `--rpc-url`)
3. `EFOREST_*` / `AELF_*` environment variables
4. `.env` file
5. CMS remote config
6. Code defaults (ENV_PRESETS)

## Testing

```bash
bun test              # All tests
bun test:unit         # Unit tests only
bun test:integration  # Integration tests only
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AELF_PRIVATE_KEY` | aelf wallet private key | (required) |
| `EFOREST_NETWORK` / `AELF_ENV` | `mainnet` or `testnet` | `mainnet` |
| `EFOREST_API_URL` / `AELF_API_URL` | Backend API URL | auto |
| `EFOREST_RPC_URL` / `AELF_RPC_URL` | AELF MainChain RPC | auto |
| `EFOREST_RPC_URL_TDVV` | tDVV RPC URL | auto |

## License

[MIT](LICENSE)
