[English](README.md) | [中文](README_zh-CN.md)

# eForest Agent Skills

[![Unit Tests](https://github.com/eforest-finance/eforest-agent-skills/actions/workflows/publish.yml/badge.svg)](https://github.com/eforest-finance/eforest-agent-skills/actions/workflows/publish.yml)
[![Coverage](https://codecov.io/gh/eforest-finance/eforest-agent-skills/graph/badge.svg)](https://codecov.io/gh/eforest-finance/eforest-agent-skills)

面向 aelf + eForest 的 AI Agent Kit，提供 CLI、MCP Server、SDK 三种接入方式。

## 业务能力概览

### Symbol-Market 业务域

- 先做名称可用性检查与费用预估
- 购买创建资格（SEED）
- 创建 NFT / FT 资产
- 向目标地址发行资产
- 支持试运行预览、风险提示与结构化失败反馈

### Forest 业务域（聚焦常用 NFT 能力）

- NFT 创建：collection 与 item（支持批量）
- NFT 交易：上架、购买、报价、成交、撤销
- NFT 资产操作：转账、价格查询
- 扩展能力（可选）：drop、whitelist、AI、miniapp、profile、discover、realtime

## 本次更新（Forest Skillization v1）

1. 能力从 token 流程扩展到“symbol 创建 + 常用 NFT 业务”一体化。
2. 技能输入输出风格统一，接入和跨团队协作更简单。
3. 失败反馈与维护中提示更清晰，减少主流程中断风险。
4. Forest 能力按 P0/P1/P2 分层，便于分阶段上线与验收。
5. 保留旧工具可用，迁移可逐步进行，不影响现有使用。

## Forest Skills（P0 / P1 / P2）

### P0（核心交易闭环）

Workflow：
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

Method（Contract）：
- `aelf-forest-contract-market`
- `aelf-forest-contract-multitoken`
- `aelf-forest-contract-token-adapter`
- `aelf-forest-contract-proxy`

Method（API）：
- `aelf-forest-api-market`
- `aelf-forest-api-nft`
- `aelf-forest-api-collection`
- `aelf-forest-api-sync`
- `aelf-forest-api-seed-auction`

### P1（增长能力）

Workflow：
- `aelf-forest-issue-item`
- `aelf-forest-place-bid`
- `aelf-forest-claim-drop`
- `aelf-forest-query-drop`
- `aelf-forest-whitelist-read`
- `aelf-forest-whitelist-manage`

Method（Contract）：
- `aelf-forest-contract-auction`
- `aelf-forest-contract-drop`
- `aelf-forest-contract-whitelist`

Method（API）：
- `aelf-forest-api-drop`
- `aelf-forest-api-whitelist`

### P2（扩展能力）

Workflow：
- `aelf-forest-ai-generate`
- `aelf-forest-ai-retry`
- `aelf-forest-create-platform-nft`
- `aelf-forest-miniapp-action`
- `aelf-forest-update-profile`
- `aelf-forest-query-collections`
- `aelf-forest-watch-market-signals`

Method（Contract）：
- `aelf-forest-contract-miniapp`

Method（API）：
- `aelf-forest-api-ai`
- `aelf-forest-api-platform`
- `aelf-forest-api-miniapp`
- `aelf-forest-api-user`
- `aelf-forest-api-system`
- `aelf-forest-api-realtime`

## 快速开始

### 前置条件

- [Bun](https://bun.sh) >= 1.0
- 可用的 aelf 钱包私钥（EOA）或 Portkey CA 钱包凭据

### 安装

```bash
git clone https://github.com/eforest-finance/eforest-agent-skills.git
cd eforest-agent-skills
bun install
```

### 配置

```bash
cp .env.example .env
# 编辑 .env，填入钱包凭据
```

### CLI 使用（Legacy）

```bash
# 查询 SEED 价格（dry-run，不发交易）
bun run cli buy-seed --symbol MYTOKEN --issuer <你的地址> --dry-run

# 购买 SEED（限价 2 ELF）
bun run cli buy-seed --symbol MYTOKEN --issuer <你的地址> --force 2

# 在 tDVV 侧链创建 Token
bun run cli create-token \
  --symbol MYTOKEN --token-name "My Token" \
  --seed-symbol SEED-321 \
  --total-supply 100000000 --decimals 8 \
  --issue-chain tDVV

# 发行 Token
bun run cli issue-token \
  --symbol MYTOKEN --amount 10000000000000000 \
  --to <接收地址> --chain tDVV
```

## MCP Server（Claude Desktop / Cursor）

一键配置：

```bash
# Claude Desktop
bun run setup claude

# Cursor IDE（项目级）
bun run setup cursor

# Cursor IDE（全局）
bun run setup cursor --global

# 查看配置状态
bun run setup list
```

MCP Server 会自动注册 legacy tools + 全部 `aelf-forest-*` tools（来自 skill registry）。

### 手动 MCP 配置

**EOA 模式**：

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

**CA 模式**：

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

## Forest API Route Map（配置优先）

Method API skill 的路由映射通过环境变量配置（不写死路由分支）：

- `EFOREST_FOREST_API_ACTION_MAP_JSON`（优先）
- `FOREST_API_ACTION_MAP_JSON`（兜底）

示例：

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

## SDK 使用

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

## Envelope 与错误契约

成功返回：

```json
{
  "success": true,
  "code": "OK",
  "data": {},
  "warnings": [],
  "traceId": "..."
}
```

失败返回：

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

## Service Gating 与优雅降级

### 关键环境变量

- `EFOREST_ENABLED_SERVICES`
- `EFOREST_DISABLED_SERVICES`
- `EFOREST_MAINTENANCE_SERVICES`
- `EFOREST_DISABLE_ALL_SERVICES`
- `EFOREST_SERVICE_<SERVICE_KEY_IN_UPPERCASE>`

示例：

```bash
# 关闭 AI 与 miniapp 域
export EFOREST_DISABLED_SERVICES="forest.ai.*,forest.miniapp.*"

# market 域进入维护模式
export EFOREST_MAINTENANCE_SERVICES="forest.market.*"

# 关闭某个精确 service key
export EFOREST_SERVICE_FOREST_MARKET_WORKFLOW=false
```

## OpenClaw

### 初始化

```bash
# 1) 从 Forest registry 重新生成 catalog（3 个 legacy + 45 个 Forest skills）
bun run generate:openclaw

# 2) 生成独立 OpenClaw 配置
bun run setup openclaw

# 3) 或合并到已有 OpenClaw 配置
bun run setup openclaw --config-path /path/to/openclaw.json
```

### 调用模式

- `structured` 模式（12 个高频 NFT skills）：直接传业务参数（symbol/price/chain 等）。
- `inputJson` 模式（33 个长尾 Forest skills）：传一个 JSON 字符串覆盖完整输入。

**Structured 示例**（`aelf-forest-list-item`）：

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

**inputJson 示例**（`aelf-forest-api-market`）：

```json
{
  "inputJson": "{\"action\":\"fetchTokens\",\"params\":{\"chainId\":\"AELF\",\"page\":1}}",
  "env": "mainnet"
}
```

### 常见失败码

- `INVALID_PARAMS`：入参与 schema 不匹配（缺字段、enum/type 错误）。
- `SERVICE_DISABLED`：对应 service key 被环境开关关闭。
- `MAINTENANCE`：服务处于维护中，或路由/配置不可用。

快速排查：
- 检查参数或 `inputJson` 结构
- 检查 `EFOREST_DISABLED_SERVICES` / `EFOREST_MAINTENANCE_SERVICES`
- 检查 `EFOREST_FOREST_API_ACTION_MAP_JSON` 的 method-api 路由映射

## 架构

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

## 配置优先级

配置解析顺序（从高到低）：

1. 函数参数（SDK 调用方）
2. CLI 参数（`--env`、`--rpc-url`）
3. `EFOREST_*` / `AELF_*` 环境变量
4. `.env` 文件
5. CMS 远程配置
6. 代码默认值（`ENV_PRESETS`）

## 测试

```bash
bun test              # 全量测试
bun test:unit         # 单元测试
bun test:integration  # 集成测试
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AELF_PRIVATE_KEY` | aelf 钱包私钥（EOA） | — |
| `PORTKEY_PRIVATE_KEY` | Portkey Manager 私钥（CA） | — |
| `PORTKEY_CA_HASH` | Portkey CA hash（CA） | — |
| `PORTKEY_CA_ADDRESS` | Portkey CA 地址（CA） | — |
| `EFOREST_NETWORK` / `AELF_ENV` | `mainnet` 或 `testnet` | `mainnet` |
| `EFOREST_API_URL` / `AELF_API_URL` | 后端 API 地址 | 自动 |
| `EFOREST_RPC_URL` / `AELF_RPC_URL` | AELF 主链 RPC | 自动 |
| `EFOREST_RPC_URL_TDVV` | tDVV RPC | 自动 |
| `EFOREST_RPC_URL_TDVW` | tDVW RPC | 自动 |
| `EFOREST_ENABLED_SERVICES` | service 白名单（逗号分隔 pattern） | 空（默认全开） |
| `EFOREST_DISABLED_SERVICES` | service 关闭列表（逗号分隔 pattern） | 空 |
| `EFOREST_MAINTENANCE_SERVICES` | 维护中列表（逗号分隔 pattern） | 空 |
| `EFOREST_DISABLE_ALL_SERVICES` | 关闭全部 forest service（`true/false`） | `false` |
| `EFOREST_FOREST_API_ACTION_MAP_JSON` | Method API action 到 route 的 JSON 映射 | 空 |

## 许可证

[MIT](LICENSE)
