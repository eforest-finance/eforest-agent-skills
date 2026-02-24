import { afterEach, describe, expect, test } from 'bun:test';

import { getWallet } from '../../lib/aelf-client';
import { dispatchForestSkill } from '../../src/core/forest';
import type { ResolvedConfig } from '../../lib/types';

const TEST_PRIVATE_KEY =
  'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1f2';

const ENV_KEYS = [
  'EFOREST_DISABLED_SERVICES',
  'EFOREST_MAINTENANCE_SERVICES',
  'EFOREST_FOREST_API_ACTION_MAP_JSON',
  'FOREST_API_ACTION_MAP_JSON',
];

const savedEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) {
  savedEnv[key] = process.env[key];
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

function makeMockConfig(overrides?: Partial<ResolvedConfig>): ResolvedConfig {
  const wallet = getWallet(TEST_PRIVATE_KEY);
  return {
    apiUrl: 'https://mock.api',
    cmsUrl: 'https://mock.cms',
    connectUrl: 'https://mock.connect',
    rpcUrls: {
      AELF: 'https://mock-rpc.aelf.io',
      tDVV: 'https://mock-rpc.tdvv.io',
      tDVW: 'https://mock-rpc.tdvw.io',
    },
    contracts: {
      mainChainAddress: 'mock_multi_token_main',
      sideChainAddress: 'mock_multi_token_side',
      tokenAdapterMainAddress: 'mock_token_adapter',
      proxyMainAddress: 'mock_proxy_main',
      proxySideAddress: 'mock_proxy_side',
      marketMainAddress: 'mock_market_main',
      marketSideAddress: 'mock_market_side',
      auctionMainAddress: 'mock_auction_main',
      dropMainAddress: 'mock_drop_main',
      whitelistMainAddress: 'mock_whitelist_main',
      miniAppMainAddress: 'mock_miniapp_main',
    },
    signer: {} as any,
    wallet,
    walletAddress: wallet.address,
    ...overrides,
  } as ResolvedConfig;
}

describe('forest dispatcher', () => {
  test('returns SERVICE_DISABLED when service key is disabled', async () => {
    process.env.EFOREST_DISABLED_SERVICES = 'forest.market.*';

    const result = await dispatchForestSkill(
      'aelf-forest-list-item',
      {
        env: 'mainnet',
        payload: {
          symbol: 'NFT-1',
          quantity: 1,
          price: { symbol: 'ELF', amount: 1 },
          duration: { hours: 24 },
          chain: 'AELF',
        },
      },
      { config: makeMockConfig() },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('SERVICE_DISABLED');
    }
  });

  test('contract method dryRun does not invoke on-chain call', async () => {
    let called = false;

    const result = await dispatchForestSkill(
      'aelf-forest-contract-market',
      {
        env: 'mainnet',
        dryRun: true,
        chain: 'AELF',
        method: 'MakeOffer',
        args: { symbol: 'NFT-1' },
      },
      {
        config: makeMockConfig(),
        contractInvoker: async () => {
          called = true;
          return {};
        },
      },
    );

    expect(result.success).toBe(true);
    expect(called).toBe(false);
    if (result.success) {
      expect(result.data.dryRun).toBe(true);
      expect(result.data.executionMode).toBe('send');
    }
  });

  test('splits contract execution mode to view/send by method', async () => {
    const modes: string[] = [];

    const viewResult = await dispatchForestSkill(
      'aelf-forest-contract-multitoken',
      {
        env: 'mainnet',
        chain: 'AELF',
        method: 'GetBalance',
        args: { symbol: 'ELF', owner: 'address' },
      },
      {
        config: makeMockConfig(),
        contractInvoker: async (req) => {
          modes.push(req.mode);
          return { balance: '100000000' };
        },
      },
    );

    const sendResult = await dispatchForestSkill(
      'aelf-forest-contract-multitoken',
      {
        env: 'mainnet',
        chain: 'AELF',
        method: 'Transfer',
        args: { to: 'address', symbol: 'ELF', amount: 1 },
      },
      {
        config: makeMockConfig(),
        contractInvoker: async (req) => {
          modes.push(req.mode);
          return { TransactionId: '0xtx' };
        },
      },
    );

    expect(viewResult.success).toBe(true);
    expect(sendResult.success).toBe(true);
    expect(modes).toEqual(['view', 'send']);
  });

  test('api method passes action + params to apiInvoker', async () => {
    process.env.EFOREST_FOREST_API_ACTION_MAP_JSON = JSON.stringify({
      'aelf-forest-api-market': {
        fetchTokens: {
          method: 'GET',
          path: '/mock/tokens',
        },
      },
    });

    let received: any = null;
    const result = await dispatchForestSkill(
      'aelf-forest-api-market',
      {
        env: 'mainnet',
        action: 'fetchTokens',
        params: { chainId: 'AELF', page: 1 },
      },
      {
        config: makeMockConfig(),
        apiInvoker: async (req) => {
          received = req;
          return { rows: [], total: 0 };
        },
      },
    );

    expect(result.success).toBe(true);
    expect(received.action).toBe('fetchTokens');
    expect(received.params).toEqual({ chainId: 'AELF', page: 1 });
  });

  test('workflow passes txId and degrades sync errors to warnings', async () => {
    process.env.EFOREST_FOREST_API_ACTION_MAP_JSON = JSON.stringify({
      'aelf-forest-api-sync': {
        fetchSyncCollection: {
          method: 'POST',
          path: '/mock/sync',
        },
      },
    });

    const result = await dispatchForestSkill(
      'aelf-forest-create-item',
      {
        env: 'mainnet',
        payload: {
          symbol: 'NFT-1',
          tokenName: 'NFT #1',
          owner: 'owner-address',
          issuer: 'issuer-address',
          issueChainId: 'tDVV',
          totalSupply: 1,
          externalInfo: {},
        },
      },
      {
        config: makeMockConfig(),
        contractInvoker: async () => ({ TransactionId: '0xcreate' }),
        apiInvoker: async () => {
          throw new Error('sync timed out');
        },
      },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactionId).toBe('0xcreate');
      expect(result.warnings.some((x) => x.includes('Cross-chain sync degraded'))).toBe(
        true,
      );
    }
  });

  test('maps timeout/revert/upstream to expected failure codes', async () => {
    const timeoutResult = await dispatchForestSkill(
      'aelf-forest-contract-market',
      {
        env: 'mainnet',
        chain: 'AELF',
        method: 'MakeOffer',
        args: {},
      },
      {
        config: makeMockConfig(),
        contractInvoker: async () => {
          throw new Error('request timed out');
        },
      },
    );

    const revertResult = await dispatchForestSkill(
      'aelf-forest-contract-market',
      {
        env: 'mainnet',
        chain: 'AELF',
        method: 'MakeOffer',
        args: {},
      },
      {
        config: makeMockConfig(),
        contractInvoker: async () => {
          throw new Error('Transaction failed with status "Failed"');
        },
      },
    );

    process.env.EFOREST_FOREST_API_ACTION_MAP_JSON = JSON.stringify({
      'aelf-forest-api-market': {
        fetchTokens: {
          method: 'GET',
          path: '/mock/tokens',
        },
      },
    });

    const upstreamResult = await dispatchForestSkill(
      'aelf-forest-api-market',
      {
        env: 'mainnet',
        action: 'fetchTokens',
        params: {},
      },
      {
        config: makeMockConfig(),
        apiInvoker: async () => {
          const err: any = new Error('upstream failure');
          err.isAxiosError = true;
          err.response = { status: 500, data: { message: 'upstream failure' } };
          throw err;
        },
      },
    );

    expect(timeoutResult.success).toBe(false);
    expect(revertResult.success).toBe(false);
    expect(upstreamResult.success).toBe(false);

    if (!timeoutResult.success) expect(timeoutResult.code).toBe('TX_TIMEOUT');
    if (!revertResult.success) expect(revertResult.code).toBe('ONCHAIN_REVERT');
    if (!upstreamResult.success) expect(upstreamResult.code).toBe('UPSTREAM_ERROR');
  });
});
