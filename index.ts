/**
 * @eforest-finance/token-agent-kit — SDK Entry Point
 *
 * Re-exports core functions, types, and config for programmatic usage.
 *
 * Usage (as npm package):
 *   import { buySeed, createToken, issueToken } from '@eforest-finance/token-agent-kit';
 *   import { getNetworkConfig } from '@eforest-finance/token-agent-kit/config';
 */

// Core business logic
export { buySeed, parseSeedSymbolFromLogs } from './src/core/seed';
export { createToken } from './src/core/token';
export { issueToken, encodeIssueInput } from './src/core/issue';

// Config
export { loadEnvFile, getNetworkConfig, fetchCmsConfig } from './lib/config';

// aelf client utilities
export {
  getWallet,
  getAElfInstance,
  getContractInstance,
  getTxResult,
  callContractSend,
  callContractView,
  sleep,
} from './lib/aelf-client';

// API client
export {
  createApiClient,
  fetchAuthToken,
  fetchSeedInfo,
  saveTokenInfos,
  syncToken,
  synchronizeLoop,
  syncResultExistLoop,
} from './lib/api-client';

// Types
export type {
  ResolvedConfig,
  CmsConfigItems,
  EnvPreset,
  BuySeedParams,
  BuySeedResult,
  BuySeedDryRunResult,
  CreateTokenParams,
  CreateTokenResult,
  CreateTokenDryRunResult,
  CreateTokenContractParams,
  IssueTokenParams,
  IssueTokenResult,
  IssueTokenDryRunResult,
  IssueInput,
  SeedPriceInfo,
  SyncChainParams,
  SaveTokenInfosParams,
  DryRunStep,
  ChainId,
} from './lib/types';

// Constants
export {
  CHAIN_ID_VALUE,
  VALID_CHAINS,
  ELF_DECIMALS,
  ENV_PRESETS,
  validateChain,
  getChainIdValue,
  validateCreateTokenParams,
  validateIssueTokenParams,
  validateBuySeedParams,
} from './lib/types';
