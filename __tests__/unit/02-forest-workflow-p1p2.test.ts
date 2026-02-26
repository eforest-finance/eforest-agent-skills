import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { dispatchForestSkill } from '../../src/core/forest';
import type { ResolvedConfig } from '../../lib/types';

const ENV_KEYS = ['EFOREST_FOREST_API_ACTION_MAP_JSON', 'FOREST_API_ACTION_MAP_JSON'];

const savedEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) {
  savedEnv[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
}

function makeMockConfig(): ResolvedConfig {
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
      proxyMainAddress: 'mock_proxy_main',
      proxySideAddress: 'mock_proxy_side',
      auctionMainAddress: 'mock_auction_main',
      dropMainAddress: 'mock_drop_main',
      whitelistMainAddress: 'mock_whitelist_main',
      miniAppMainAddress: 'mock_miniapp_main',
    },
    signer: {} as any,
    wallet: {} as any,
    walletAddress: 'ELF_TEST_WALLET',
  } as ResolvedConfig;
}

beforeEach(() => {
  process.env.EFOREST_FOREST_API_ACTION_MAP_JSON = JSON.stringify({
    'aelf-forest-api-drop:fetchDropList': { method: 'GET', path: '/drop/list' },
    'aelf-forest-api-ai:fetchGenerate': { method: 'POST', path: '/ai/generate' },
    'aelf-forest-api-ai:fetchRetryGenerateAIArts': {
      method: 'POST',
      path: '/ai/retry',
    },
    'aelf-forest-api-platform:fetchCreatePlatformNFT': {
      method: 'POST',
      path: '/platform/create',
    },
    'aelf-forest-api-miniapp:fetchMiniAppUserInfo': {
      method: 'GET',
      path: '/miniapp/user',
    },
    'aelf-forest-api-user:saveUserSettings': { method: 'POST', path: '/user/settings' },
    'aelf-forest-api-nft:fetchHotNFTs': { method: 'GET', path: '/nft/hot' },
    'aelf-forest-api-collection:fetchCollections': {
      method: 'GET',
      path: '/collection/list',
    },
    'aelf-forest-api-realtime:registerHandler': {
      method: 'POST',
      path: '/realtime/register',
    },
  });
});

afterEach(() => {
  restoreEnv();
});

describe('forest workflow P1/P2 coverage', () => {
  test('P1 handlers keep success envelope on contract/api paths', async () => {
    const context = {
      config: makeMockConfig(),
      contractInvoker: async (req: any) => {
        if (req.mode === 'view') {
          return { items: [{ id: 'view-item' }] };
        }
        return { TransactionId: `tx-${req.method.toLowerCase()}` };
      },
      apiInvoker: async () => ({ rows: [{ id: 'drop-1' }] }),
    };

    const cases: Array<{ skill: string; input: Record<string, any> }> = [
      {
        skill: 'aelf-forest-issue-item',
        input: {
          env: 'mainnet',
          payload: { symbol: 'NFT-1', amount: 1, to: 'ELF_TO', chain: 'AELF' },
        },
      },
      {
        skill: 'aelf-forest-place-bid',
        input: {
          env: 'mainnet',
          payload: { auctionId: 'A-1', amount: 1, chain: 'AELF' },
        },
      },
      {
        skill: 'aelf-forest-claim-drop',
        input: {
          env: 'mainnet',
          payload: { dropId: 'D-1', claimAmount: 1, chain: 'AELF' },
        },
      },
      {
        skill: 'aelf-forest-query-drop',
        input: {
          env: 'mainnet',
          action: 'list',
          params: { page: 1 },
        },
      },
      {
        skill: 'aelf-forest-whitelist-read',
        input: {
          env: 'mainnet',
          action: 'getWhitelist',
          params: { chain: 'AELF' },
        },
      },
      {
        skill: 'aelf-forest-whitelist-manage',
        input: {
          env: 'mainnet',
          action: 'enable',
          params: { chain: 'AELF' },
        },
      },
    ];

    for (const item of cases) {
      const result = await dispatchForestSkill(item.skill, item.input as any, context);
      if (!result.success) {
        throw new Error(`${item.skill} failed: ${result.code} ${result.message}`);
      }
      expect(result.success).toBe(true);
    }
  });

  test('P2 handlers cover AI/platform/miniapp/realtime branches', async () => {
    const context = {
      config: makeMockConfig(),
      contractInvoker: async (_req: any) => ({ TransactionId: 'tx-onchain-miniapp' }),
      apiInvoker: async (req: any) => {
        if (req.skillName === 'aelf-forest-api-ai' && req.action === 'fetchGenerate') {
          return { transactionId: 'tx-ai-generate', items: [{ id: 'img-1' }] };
        }
        if (
          req.skillName === 'aelf-forest-api-realtime' &&
          req.action === 'registerHandler'
        ) {
          return [{ eventId: 'evt-1' }];
        }
        return { ok: true };
      },
    };

    const p2Cases: Array<{ skill: string; input: Record<string, any> }> = [
      {
        skill: 'aelf-forest-ai-generate',
        input: {
          env: 'mainnet',
          payload: {
            prompt: 'a forest cat',
            negativePrompt: 'blur',
            number: 1,
            size: '1024x1024',
          },
        },
      },
      {
        skill: 'aelf-forest-ai-retry',
        input: {
          env: 'mainnet',
          action: 'retryByTransactionId',
          params: { transactionId: 'tx-1' },
        },
      },
      {
        skill: 'aelf-forest-create-platform-nft',
        input: {
          env: 'mainnet',
          action: 'create',
          params: { symbol: 'NFT-1' },
        },
      },
      {
        skill: 'aelf-forest-miniapp-action',
        input: {
          env: 'mainnet',
          action: 'onchainAddPoints',
          params: { chain: 'AELF', amount: 1 },
        },
      },
      {
        skill: 'aelf-forest-miniapp-action',
        input: {
          env: 'mainnet',
          action: 'userInfo',
          params: { address: 'ELF_USER' },
        },
      },
      {
        skill: 'aelf-forest-update-profile',
        input: {
          env: 'mainnet',
          payload: { name: 'mock-user' },
        },
      },
      {
        skill: 'aelf-forest-query-collections',
        input: {
          env: 'mainnet',
          action: 'hot',
          params: { page: 1 },
        },
      },
      {
        skill: 'aelf-forest-query-collections',
        input: {
          env: 'mainnet',
          action: 'collections',
          params: { page: 1 },
        },
      },
      {
        skill: 'aelf-forest-watch-market-signals',
        input: {
          env: 'mainnet',
          action: 'subscribe',
          channels: ['ReceiveSymbolBidInfo'],
          address: 'ELF_USER',
        },
      },
    ];

    for (const item of p2Cases) {
      const result = await dispatchForestSkill(item.skill, item.input as any, context);
      if (!result.success) {
        throw new Error(`${item.skill} failed: ${result.code} ${result.message}`);
      }
      expect(result.success).toBe(true);
    }
  });
});
