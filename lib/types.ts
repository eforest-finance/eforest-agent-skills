/**
 * @eforest-finance/token-agent-kit — Shared types, interfaces, and constants.
 */

// ============================================================================
// Chain Constants
// ============================================================================

export const CHAIN_ID_VALUE: Record<string, number> = {
  tDVW: 1931928,
  tDVV: 1866392,
  AELF: 9992731,
};

export const VALID_CHAINS = ['AELF', 'tDVV', 'tDVW'] as const;
export type ChainId = (typeof VALID_CHAINS)[number];

export const ELF_DECIMALS = 8;

export const TX_POLL_INTERVAL_MS = 1000;
export const TX_POLL_MAX_RETRIES = 10;
export const SYNC_POLL_INTERVAL_MS = 20_000;
export const SYNC_POLL_MAX_RETRIES = 30;

// Minimal protobuf definition for encoding IssueInput when using ForwardCall
// via Proxy contract. Extracted from src/proto/token_contract.json.
export const ISSUE_INPUT_PROTO_DEF = {
  nested: {
    token: {
      nested: {
        IssueInput: {
          fields: {
            symbol: { type: 'string', id: 1 },
            amount: { type: 'int64', id: 2 },
            memo: { type: 'string', id: 3 },
            to: { type: 'aelf.Address', id: 4 },
          },
        },
      },
    },
    aelf: {
      nested: {
        Address: {
          fields: { value: { type: 'bytes', id: 1 } },
        },
      },
    },
  },
};

// ============================================================================
// Network / Environment Presets
// ============================================================================

export interface EnvPreset {
  apiUrl: string;
  cmsUrl: string;
  connectUrl: string;
  rpcUrlAELF: string;
  rpcUrlTDVV: string;
  rpcUrlTDVW: string;
}

export const ENV_PRESETS: Record<string, EnvPreset> = {
  mainnet: {
    apiUrl: 'https://www.eforest.finance/api',
    cmsUrl: 'https://www.eforest.finance/cms',
    connectUrl: 'https://www.eforest.finance/connect',
    rpcUrlAELF: 'https://aelf-public-node.aelf.io',
    rpcUrlTDVV: 'https://tdvv-public-node.aelf.io',
    rpcUrlTDVW: '',
  },
  testnet: {
    apiUrl: 'https://test.eforest.finance/api',
    cmsUrl: 'https://test.eforest.finance/cms',
    connectUrl: 'https://test.eforest.finance/connect',
    rpcUrlAELF: 'https://aelf-test-node.aelf.io',
    rpcUrlTDVV: 'https://tdvv-test-node.aelf.io',
    rpcUrlTDVW: 'https://tdvw-test-node.aelf.io',
  },
};

// ============================================================================
// Config Interfaces
// ============================================================================

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

// ============================================================================
// Core Function Params & Results
// ============================================================================

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
