/**
 * @eforest-finance/token-agent-kit — Network configuration and env management.
 *
 * Config priority (high → low):
 *   1. Function params (SDK callers)
 *   2. CLI args (--env, --rpc-url)
 *   3. MCP env block (mcp.json → env: {})
 *   4. EFOREST_* / AELF_* environment variables
 *   5. .env file (auto-loaded)
 *   6. CMS remote config
 *   7. Code defaults (ENV_PRESETS)
 */

import axios from 'axios';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { CmsConfigItems, ResolvedConfig } from './types';
import { ENV_PRESETS } from './types';
import { getWallet } from './aelf-client';

// ============================================================================
// .env Loader
// ============================================================================

export function loadEnvFile(envPath?: string): void {
  const resolvedPath =
    envPath ||
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');

  if (!existsSync(resolvedPath)) return;

  const content = readFileSync(resolvedPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// ============================================================================
// CMS Config Fetch
// ============================================================================

/**
 * Fetch contract addresses and RPC endpoints from eForest CMS.
 *
 * FIX(CMS-parse): CMS returns a doubly-nested structure:
 *   HTTP body → { data: { id: 1, data: { ...actualConfig } } }
 *   axios parses → resp.data = { data: { id: 1, data: { ...actualConfig } } }
 *   So actual config is at resp.data.data.data.
 */
export async function fetchCmsConfig(cmsUrl: string): Promise<CmsConfigItems> {
  try {
    const resp = await axios.get(`${cmsUrl}/items/config`);
    const outer = resp.data?.data;
    return outer?.data || outer || resp.data || {};
  } catch {
    return {};
  }
}

// ============================================================================
// getNetworkConfig — single entry point
// ============================================================================

export async function getNetworkConfig(opts?: {
  env?: string;
  privateKey?: string;
  apiUrl?: string;
  rpcUrl?: string;
}): Promise<ResolvedConfig> {
  const o = opts || {};
  const envName =
    o.env ||
    process.env.EFOREST_NETWORK ||
    process.env.AELF_ENV ||
    'mainnet';

  const preset = ENV_PRESETS[envName];
  if (!preset) {
    throw new Error(`Unknown env "${envName}". Use "mainnet" or "testnet".`);
  }

  const apiUrl =
    o.apiUrl ||
    process.env.EFOREST_API_URL ||
    process.env.AELF_API_URL ||
    preset.apiUrl;

  const cmsUrl = preset.cmsUrl;
  const connectUrl = preset.connectUrl;

  const cmsConfig = await fetchCmsConfig(cmsUrl);

  // FIX(RPC-priority): CMS may return internal/unreachable RPC URLs.
  // Priority: CLI arg > env var > preset public nodes > CMS nodes.
  const rpcUrls: Record<string, string> = {
    AELF:
      o.rpcUrl ||
      process.env.EFOREST_RPC_URL ||
      process.env.AELF_RPC_URL ||
      preset.rpcUrlAELF ||
      cmsConfig.rpcUrlAELF ||
      '',
    tDVV:
      process.env.EFOREST_RPC_URL_TDVV ||
      process.env.AELF_RPC_URL_TDVV ||
      preset.rpcUrlTDVV ||
      cmsConfig.rpcUrlTDVV ||
      '',
    tDVW:
      process.env.EFOREST_RPC_URL_TDVW ||
      process.env.AELF_RPC_URL_TDVW ||
      preset.rpcUrlTDVW ||
      cmsConfig.rpcUrlTDVW ||
      '',
  };

  const wallet = getWallet(o.privateKey);
  const walletAddress = wallet.address;

  return {
    apiUrl,
    cmsUrl,
    connectUrl,
    rpcUrls,
    contracts: cmsConfig,
    wallet,
    walletAddress,
  };
}
