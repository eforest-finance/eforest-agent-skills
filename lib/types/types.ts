/**
 * Shared domain/input-output types for eforest skills.
 */

import { CHAIN_ID_VALUE, VALID_CHAINS } from './constants';

export interface CmsConfigItems {
  mainChainAddress?: string;
  sideChainAddress?: string;
  symbolRegisterMainAddress?: string;
  tokenAdapterMainAddress?: string;
  proxyMainAddress?: string;
  proxySideAddress?: string;
  rpcUrlAELF?: string;
  rpcUrlTDVV?: string;
  rpcUrlTDVW?: string;
  curChain?: string;
  [key: string]: any;
}

export interface ResolvedConfig {
  apiUrl: string;
  cmsUrl: string;
  connectUrl: string;
  rpcUrls: Record<string, string>;
  contracts: CmsConfigItems;
  /** Unified signer — supports both EOA and CA wallets. Use for all contract calls. */
  signer: import('@portkey/aelf-signer').AelfSigner;
  /** Raw wallet for API auth (fetchAuthToken). For CA: manager wallet. */
  wallet: any;
  /** Identity address: CA address (CA mode) or wallet address (EOA mode). */
  walletAddress: string;
}

/** buy-seed */
export interface BuySeedParams {
  symbol: string;
  issueTo: string;
  /** false/undefined = refuse; true = buy unconditionally; number = max ELF price */
  force?: boolean | number;
}

export interface BuySeedResult {
  success: boolean;
  transactionId: string;
  /** Real on-chain SEED symbol, e.g. "SEED-321" */
  seedSymbol: string | null;
  data: {
    symbol: string;
    issueTo: string;
    priceELF: number | null;
    priceSymbol: string;
  };
  warnings: string[];
}

export interface BuySeedDryRunResult {
  dryRun: true;
  priceELF: number | null;
  priceSymbol: string;
  available: boolean;
  steps: DryRunStep[];
}

/** create-token */
export interface CreateTokenParams {
  symbol: string;
  tokenName: string;
  seedSymbol: string;
  totalSupply: string;
  decimals: number;
  issuer: string;
  issueChain: string;
  isBurnable: boolean;
  tokenImage: string;
}

export interface CreateTokenResult {
  success: boolean;
  transactionId: string;
  /** On-chain issuer (proxy account) — pass to issue-token */
  proxyIssuer: string;
  crossChainSynced: boolean;
  warning?: string;
  data: {
    symbol: string;
    tokenName: string;
    issueChain: string;
    totalSupply: string;
    decimals: number;
  };
  warnings: string[];
}

export interface CreateTokenDryRunResult {
  dryRun: true;
  steps: DryRunStep[];
}

/** issue-token */
export interface IssueTokenParams {
  symbol: string;
  amount: number;
  to: string;
  memo: string;
  chain: string;
  /** Optional: override proxy issuer address (from create-token output) */
  issuer?: string;
}

export interface IssueTokenResult {
  success: boolean;
  transactionId: string;
  proxyIssuer: string;
  proxyAccountHash: string;
  data: IssueInput;
  warnings: string[];
}

export interface IssueTokenDryRunResult {
  dryRun: true;
  steps: DryRunStep[];
}

/** Shared inner types */
export interface CreateTokenContractParams {
  symbol: string;
  tokenName: string;
  seedSymbol: string;
  totalSupply: string;
  decimals: number;
  issuer: string;
  isBurnable: boolean;
  issueChainId: number;
  owner: string;
  externalInfo: { value: { __ft_image_uri: string } };
}

export interface IssueInput {
  symbol: string;
  amount: number;
  memo: string;
  to: string;
}

export interface SeedPriceInfo {
  symbol: string;
  tokenPrice?: { symbol: string; amount: number };
  seedType?: number;
  /** 0 = available, 1 = in auction, 2 = registered/purchased */
  status?: number;
  owner?: string;
  seedSymbol?: string;
}

export interface SyncChainParams {
  fromChainId: string;
  toChainId: string;
  symbol: string;
  txHash: string;
}

export interface SaveTokenInfosParams {
  chainId: string;
  transactionId: string;
  symbol?: string;
  previewImage?: string;
}

export interface DryRunStep {
  action: string;
  contract?: string;
  method?: string;
  params?: any;
  api?: string;
}

// ============================================================================
// Validation Helpers (pure functions)
// ============================================================================

export function validateChain(chain: string): void {
  if (!VALID_CHAINS.includes(chain as any)) {
    throw new Error(
      `Invalid chain "${chain}". Must be one of: ${VALID_CHAINS.join(', ')}`,
    );
  }
}

export function getChainIdValue(chain: string): number {
  const value = CHAIN_ID_VALUE[chain];
  if (value === undefined) {
    throw new Error(`Unknown chain: ${chain}`);
  }
  return value;
}

export function validateCreateTokenParams(opts: any): void {
  const required = ['symbol', 'tokenName', 'seedSymbol', 'totalSupply', 'decimals', 'issueChain'];
  for (const field of required) {
    if (!opts[field] && opts[field] !== 0) {
      throw new Error(`Missing required parameter: --${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    }
  }
  const decimals = Number(opts.decimals);
  if (isNaN(decimals) || decimals < 0 || decimals > 18 || !Number.isInteger(decimals)) {
    throw new Error('Decimals must be an integer between 0 and 18.');
  }
  const totalSupply = BigInt(opts.totalSupply);
  if (totalSupply <= 0n) {
    throw new Error('Total supply must be a positive integer.');
  }
  const maxSupply = 9223372036854775807n;
  const supplyWithDecimals = totalSupply * BigInt(10 ** decimals);
  if (supplyWithDecimals > maxSupply) {
    throw new Error(
      `Total supply * 10^decimals exceeds max (9223372036854775807). Current: ${supplyWithDecimals}`,
    );
  }
  validateChain(opts.issueChain);
}

export function validateIssueTokenParams(opts: any): void {
  const required = ['symbol', 'amount', 'to', 'chain'];
  for (const field of required) {
    if (!opts[field] && opts[field] !== 0) {
      throw new Error(`Missing required parameter: --${field}`);
    }
  }
  if (Number(opts.amount) <= 0) {
    throw new Error('Amount must be a positive number.');
  }
  validateChain(opts.chain);
}

export function validateBuySeedParams(opts: any): void {
  if (!opts.symbol) throw new Error('Missing required parameter: --symbol');
  if (!opts.issuer) throw new Error('Missing required parameter: --issuer');
}
