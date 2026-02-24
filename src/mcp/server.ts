#!/usr/bin/env bun
/**
 * @eforest-finance/token-agent-kit — MCP Server Adapter
 *
 * Registers legacy token lifecycle tools and forest skill tools.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { loadEnvFile, getNetworkConfig } from '../../lib/config';
import { buySeed } from '../core/seed';
import { createToken } from '../core/token';
import { issueToken } from '../core/issue';
import { dispatchForestSkill } from '../core/forest';
import {
  validateBuySeedParams,
  validateCreateTokenParams,
  validateIssueTokenParams,
} from '../../lib/types';
import { listForestSkills } from '../../lib/forest-skill-registry';

// Load env on startup
loadEnvFile();

// ============================================================================
// Helpers
// ============================================================================

function ok(data: any) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

function fail(err: any) {
  const msg =
    typeof err === 'string'
      ? err
      : err?.message ||
        (typeof err === 'object' ? JSON.stringify(err) : String(err)) ||
        'Unknown error';
  return {
    content: [{ type: 'text' as const, text: `[ERROR] ${msg}` }],
    isError: true,
  };
}

// ============================================================================
// MCP Server
// ============================================================================

const server = new McpServer({
  name: 'eforest-token-agent-kit',
  version: '0.3.0',
});

// --- aelf-buy-seed ---
server.tool(
  'aelf-buy-seed',
  `Purchase a SEED on aelf MainChain. Supports both EOA and CA (Portkey) wallets.
Returns seedSymbol (e.g. "SEED-321") needed for create-token.
Performs pre-flight availability check, ELF balance check, and Approve before Buy.
Price safety: requires --force or force param. Use force=2 for max 2 ELF.`,
  {
    symbol: z
      .string()
      .describe('Token symbol to register (e.g. "MYTOKEN")'),
    issuer: z
      .string()
      .describe(
        'Token issuer / issueTo address (usually the wallet address)',
      ),
    force: z
      .union([z.boolean(), z.number()])
      .optional()
      .describe(
        'true = buy unconditionally; number = max ELF price limit (e.g. 2)',
      ),
    dryRun: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, return execution plan without sending tx'),
  },
  async (params) => {
    try {
      validateBuySeedParams({ symbol: params.symbol, issuer: params.issuer });
      const config = await getNetworkConfig();
      const result = await buySeed(
        config,
        {
          symbol: params.symbol,
          issueTo: params.issuer,
          force: params.force,
        },
        params.dryRun,
      );
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  },
);

// --- aelf-create-token ---
server.tool(
  'aelf-create-token',
  `Create a new FT token on aelf using an owned SEED (from buy-seed output seedSymbol).
Supports both EOA and CA (Portkey) wallets.
Handles SEED Approve, TokenAdapter.CreateToken, backend save, and cross-chain sync.
Returns proxyIssuer (proxy account address) needed for issue-token.
Cross-chain sync has graceful degradation: success=true even if sync times out.`,
  {
    symbol: z.string().describe('Token symbol (e.g. "MYTOKEN")'),
    tokenName: z.string().describe('Token display name'),
    seedSymbol: z
      .string()
      .describe(
        'Owned SEED symbol from buy-seed output (e.g. "SEED-321")',
      ),
    totalSupply: z
      .string()
      .describe('Maximum total supply as integer string'),
    decimals: z
      .number()
      .int()
      .min(0)
      .max(18)
      .describe('Token decimals (0-18)'),
    issuer: z
      .string()
      .optional()
      .describe(
        'Token issuer address. Defaults to wallet address. On-chain issuer will be a proxy.',
      ),
    issueChain: z
      .enum(['AELF', 'tDVV', 'tDVW'])
      .describe('Issue chain'),
    isBurnable: z.boolean().optional().default(true),
    tokenImage: z.string().optional().default('').describe('Token logo URL'),
    dryRun: z.boolean().optional().default(false),
  },
  async (params) => {
    try {
      const config = await getNetworkConfig();
      const issuer = params.issuer || config.walletAddress;

      const opts = { ...params, issuer, tokenImage: params.tokenImage || '' };
      validateCreateTokenParams(opts);

      const result = await createToken(config, opts, params.dryRun);
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  },
);

// --- aelf-issue-token ---
server.tool(
  'aelf-issue-token',
  `Issue tokens to an address via Proxy ForwardCall. Supports both EOA and CA (Portkey) wallets.
Because TokenAdapter creates a proxy account as on-chain issuer, this routes through ProxyContract.
Auto-detects proxyIssuer from GetTokenInfo if not provided.
Steps: GetTokenInfo → GetProxyAccount → encode IssueInput → ForwardCall.`,
  {
    symbol: z.string().describe('Token symbol to issue'),
    amount: z.number().positive().describe('Amount to issue'),
    to: z.string().describe('Recipient address'),
    chain: z
      .enum(['AELF', 'tDVV', 'tDVW'])
      .describe('Target chain'),
    issuer: z
      .string()
      .optional()
      .describe(
        'Proxy issuer address (from create-token proxyIssuer). Auto-detected if omitted.',
      ),
    memo: z.string().optional().default(''),
    dryRun: z.boolean().optional().default(false),
  },
  async (params) => {
    try {
      validateIssueTokenParams(params);
      const config = await getNetworkConfig();
      const result = await issueToken(
        config,
        { ...params, memo: params.memo || '' },
        params.dryRun,
      );
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  },
);

// ============================================================================
// Forest tool registration (registry driven)
// ============================================================================

const forestBaseToolSchema = {
  env: z.enum(['mainnet', 'testnet']).optional().default('mainnet'),
  dryRun: z.boolean().optional().default(false),
  traceId: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(180000).optional(),

  payload: z.record(z.any()).optional(),
  action: z.string().optional(),
  params: z.record(z.any()).optional(),

  method: z.string().optional(),
  chain: z.enum(['AELF', 'tDVV', 'tDVW']).optional(),
  args: z.record(z.any()).optional(),

  channels: z.array(z.string()).optional(),
  address: z.string().optional(),
};

function buildForestToolDescription(skill: {
  name: string;
  tier: string;
  kind: string;
  serviceKey: string;
  in: string;
  out: string;
}): string {
  return [
    `Forest skill (${skill.tier}).`,
    `Kind: ${skill.kind}`,
    `Service key: ${skill.serviceKey}`,
    `Input schema: ${skill.in}`,
    `Output schema: ${skill.out}`,
    'Use env/dryRun/traceId/timeoutMs envelope fields for standard behavior.',
  ].join('\n');
}

for (const skill of listForestSkills()) {
  server.tool(
    skill.name,
    buildForestToolDescription(skill),
    forestBaseToolSchema,
    async (params) => {
      try {
        const env = params.env || process.env.EFOREST_NETWORK || 'mainnet';
        const config = await getNetworkConfig({ env });
        const result = await dispatchForestSkill(
          skill.name,
          {
            ...params,
            env,
          },
          { config },
        );
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );
}

// ============================================================================
// Start
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[MCP] Fatal:', err);
  process.exit(1);
});
