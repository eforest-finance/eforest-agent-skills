[English](README.md) | [中文](README_zh-CN.md)

# eForest Agent Skills

基于 [eForest](https://www.eforest.finance) 的 aelf 区块链 Token 生命周期管理 AI Agent Kit。提供 CLI、MCP Server 和 SDK 三种接口：

- **buy-seed** — 从 SymbolRegister 合约购买 SEED
- **create-token** — 使用已拥有的 SEED 创建 FT Token（含跨链同步）
- **issue-token** — 通过 Proxy ForwardCall 机制发行 Token

## 快速开始

### 前置条件

- [Bun](https://bun.sh) >= 1.0
- 一个持有 ELF 余额的 aelf 钱包私钥

### 安装

```bash
git clone https://github.com/eforest-finance/eforest-agent-skills.git
cd eforest-agent-skills
bun install
```

### 配置

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 AELF_PRIVATE_KEY
```

### CLI 使用

```bash
# 查询 SEED 价格（dry-run 模式，不会发起交易）
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

一键配置 AI 平台集成：

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

配置完成后，编辑生成的配置文件，将 `<YOUR_PRIVATE_KEY>` 替换为你的真实私钥。

### 手动 MCP 配置

如果你更倾向手动配置，将以下内容添加到 MCP 设置文件中：

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
# 生成 OpenClaw 配置（使用绝对路径）
bun run setup openclaw

# 合并到已有配置
bun run setup openclaw --config-path /path/to/openclaw.json
```

## SDK 使用

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

## 架构

```
eforest-agent-skills/
├── lib/                  # 基础设施层
│   ├── types.ts          # 接口定义、常量、validators
│   ├── config.ts         # 网络配置 & .env 加载
│   ├── aelf-client.ts    # aelf-sdk 封装
│   └── api-client.ts     # eForest 后端 API 客户端
├── src/
│   ├── core/             # 纯业务逻辑（无 I/O 副作用）
│   │   ├── seed.ts       # buySeed + parseSeedSymbolFromLogs
│   │   ├── token.ts      # createToken
│   │   └── issue.ts      # issueToken + encodeIssueInput
│   └── mcp/
│       └── server.ts     # MCP Server 适配器（Zod 验证）
├── bin/
│   ├── setup.ts          # Setup CLI 入口
│   └── platforms/        # Claude、Cursor、OpenClaw 平台适配器
├── create_token_skill.ts # CLI 适配器（薄包装层）
├── index.ts              # SDK 入口（re-exports）
├── openclaw.json         # OpenClaw 工具定义
└── __tests__/            # 单元测试 + 集成测试
```

## 配置优先级

配置项按以下顺序解析（优先级从高到低）：

1. 函数参数（SDK 调用方传入）
2. CLI 参数（`--env`、`--rpc-url`）
3. `EFOREST_*` / `AELF_*` 环境变量
4. `.env` 文件
5. CMS 远程配置
6. 代码默认值（ENV_PRESETS）

## 测试

```bash
bun test              # 运行所有测试
bun test:unit         # 仅运行单元测试
bun test:integration  # 仅运行集成测试
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AELF_PRIVATE_KEY` | aelf 钱包私钥 | （必填） |
| `EFOREST_NETWORK` / `AELF_ENV` | `mainnet` 或 `testnet` | `mainnet` |
| `EFOREST_API_URL` / `AELF_API_URL` | 后端 API 地址 | 自动 |
| `EFOREST_RPC_URL` / `AELF_RPC_URL` | AELF 主链 RPC 地址 | 自动 |
| `EFOREST_RPC_URL_TDVV` | tDVV 侧链 RPC 地址 | 自动 |

## 许可证

[MIT](LICENSE)
