import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ResolvedConfig } from '../../lib/types';
import * as realAelfClient from '../../lib/aelf-client';
import * as realApiClient from '../../lib/api-client';

type CoreFlowMockState = {
  contractViewCalls: Array<{
    rpcUrl: string;
    contractAddress: string;
    method: string;
    params: any;
  }>;
  contractSendCalls: Array<{
    rpcUrl: string;
    contractAddress: string;
    method: string;
    params: any;
  }>;
  saveTokenInfosCalls: any[];
  syncTokenCalls: any[];
  syncResultExistLoopCalls: any[];

  fetchSeedInfoImpl: (apiUrl: string, symbol: string) => Promise<any>;
  fetchAuthTokenImpl: (connectUrl: string, wallet: any) => Promise<string>;
  createApiClientImpl: (apiUrl: string, token?: string) => any;
  saveTokenInfosImpl: (api: any, params: any) => Promise<void>;
  syncTokenImpl: (api: any, params: any) => Promise<void>;
  syncResultExistLoopImpl: (
    api: any,
    issueChainId: string,
    tokenSymbol: string,
  ) => Promise<boolean>;
  callContractViewImpl: (
    rpcUrl: string,
    contractAddress: string,
    method: string,
    params: any,
  ) => Promise<any>;
  callContractSendImpl: (
    rpcUrl: string,
    contractAddress: string,
    method: string,
    params: any,
    signer: any,
  ) => Promise<any>;
};

const defaultState = (): CoreFlowMockState => ({
  contractViewCalls: [],
  contractSendCalls: [],
  saveTokenInfosCalls: [],
  syncTokenCalls: [],
  syncResultExistLoopCalls: [],

  fetchSeedInfoImpl: async () => ({
    status: 0,
    tokenPrice: { symbol: 'ELF', amount: 1 },
  }),
  fetchAuthTokenImpl: async () => 'mock-access-token',
  createApiClientImpl: (apiUrl: string, token?: string) => ({
    apiUrl,
    token,
  }),
  saveTokenInfosImpl: async () => {},
  syncTokenImpl: async () => {},
  syncResultExistLoopImpl: async () => true,
  callContractViewImpl: async (
    _rpcUrl: string,
    _contractAddress: string,
    method: string,
    _params: any,
  ) => {
    if (method === 'GetBalance') {
      return { balance: String(20 * 10 ** 8) };
    }
    if (method === 'GetAllowance') {
      return { allowance: '0' };
    }
    if (method === 'GetTokenInfo') {
      return { issuer: 'ELF_PROXY_ISSUER' };
    }
    if (method === 'GetProxyAccountByProxyAccountAddress') {
      return { proxyAccountHash: { value: Buffer.from([0xde, 0xad, 0xbe, 0xef]) } };
    }
    return {};
  },
  callContractSendImpl: async (
    _rpcUrl: string,
    _contractAddress: string,
    method: string,
    _params: any,
    _signer: any,
  ) => {
    if (method === 'Buy') {
      return {
        TransactionId: 'tx-buy',
        txResult: {
          Logs: [
            {
              Name: 'SeedCreated',
              Indexed: [Buffer.from('prefix SEED-777 suffix').toString('base64')],
            },
          ],
        },
      };
    }
    if (method === 'CreateToken') {
      return { TransactionId: 'tx-create' };
    }
    if (method === 'ForwardCall') {
      return { TransactionId: 'tx-issue' };
    }
    return { TransactionId: `tx-${method.toLowerCase()}` };
  },
});

const g = globalThis as any;
const state: CoreFlowMockState =
  g.__CORE_FLOW_MOCK_STATE || (g.__CORE_FLOW_MOCK_STATE = defaultState());

function resetState(): void {
  const d = defaultState();
  state.contractViewCalls = d.contractViewCalls;
  state.contractSendCalls = d.contractSendCalls;
  state.saveTokenInfosCalls = d.saveTokenInfosCalls;
  state.syncTokenCalls = d.syncTokenCalls;
  state.syncResultExistLoopCalls = d.syncResultExistLoopCalls;
  state.fetchSeedInfoImpl = d.fetchSeedInfoImpl;
  state.fetchAuthTokenImpl = d.fetchAuthTokenImpl;
  state.createApiClientImpl = d.createApiClientImpl;
  state.saveTokenInfosImpl = d.saveTokenInfosImpl;
  state.syncTokenImpl = d.syncTokenImpl;
  state.syncResultExistLoopImpl = d.syncResultExistLoopImpl;
  state.callContractViewImpl = d.callContractViewImpl;
  state.callContractSendImpl = d.callContractSendImpl;
}

mock.module('../../lib/aelf-client', () => ({
  ...realAelfClient,
  callContractView: async (
    rpcUrl: string,
    contractAddress: string,
    method: string,
    params: any,
  ) => {
    state.contractViewCalls.push({ rpcUrl, contractAddress, method, params });
    return await state.callContractViewImpl(
      rpcUrl,
      contractAddress,
      method,
      params,
    );
  },
  callContractSend: async (
    rpcUrl: string,
    contractAddress: string,
    method: string,
    params: any,
    signer: any,
  ) => {
    state.contractSendCalls.push({ rpcUrl, contractAddress, method, params });
    return await state.callContractSendImpl(
      rpcUrl,
      contractAddress,
      method,
      params,
      signer,
    );
  },
}));

mock.module('../../lib/api-client', () => ({
  ...realApiClient,
  fetchSeedInfo: async (apiUrl: string, symbol: string) =>
    await state.fetchSeedInfoImpl(apiUrl, symbol),
  fetchAuthToken: async (connectUrl: string, wallet: any) =>
    await state.fetchAuthTokenImpl(connectUrl, wallet),
  createApiClient: (apiUrl: string, token?: string) =>
    state.createApiClientImpl(apiUrl, token),
  saveTokenInfos: async (api: any, params: any) => {
    state.saveTokenInfosCalls.push(params);
    await state.saveTokenInfosImpl(api, params);
  },
  syncToken: async (api: any, params: any) => {
    state.syncTokenCalls.push(params);
    await state.syncTokenImpl(api, params);
  },
  syncResultExistLoop: async (
    api: any,
    issueChainId: string,
    tokenSymbol: string,
  ) => {
    state.syncResultExistLoopCalls.push({ issueChainId, tokenSymbol });
    return await state.syncResultExistLoopImpl(api, issueChainId, tokenSymbol);
  },
}));

let buySeed: typeof import('../../src/core/seed').buySeed;
let createToken: typeof import('../../src/core/token').createToken;
let issueToken: typeof import('../../src/core/issue').issueToken;

const TEST_PRIVATE_KEY =
  'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1f2';
const TEST_ADDRESS = realAelfClient.getWallet(TEST_PRIVATE_KEY).address;

const makeConfig = (): ResolvedConfig =>
  ({
    apiUrl: 'https://mock.api',
    cmsUrl: 'https://mock.cms',
    connectUrl: 'https://mock.connect',
    rpcUrls: {
      AELF: 'https://mock-rpc-aelf',
      tDVV: 'https://mock-rpc-tdvv',
      tDVW: 'https://mock-rpc-tdvw',
    },
    contracts: {
      mainChainAddress: 'mock_main_chain',
      sideChainAddress: 'mock_side_chain',
      symbolRegisterMainAddress: 'mock_symbol_register',
      tokenAdapterMainAddress: 'mock_token_adapter',
      proxyMainAddress: 'mock_proxy_main',
      proxySideAddress: 'mock_proxy_side',
    },
    signer: {} as any,
    wallet: {} as any,
    walletAddress: TEST_ADDRESS,
  }) as ResolvedConfig;

beforeAll(async () => {
  ({ buySeed } = await import('../../src/core/seed'));
  ({ createToken } = await import('../../src/core/token'));
  ({ issueToken } = await import('../../src/core/issue'));
});

beforeEach(() => {
  resetState();
});

describe('core flows (mocked)', () => {
  test('buySeed succeeds with force=true and parses seed symbol from logs', async () => {
    const result = await buySeed(
      makeConfig(),
      { symbol: 'ALPHA', issueTo: 'ELF_ISSUE_TO', force: true },
      false,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transactionId).toBe('tx-buy');
      expect(result.seedSymbol).toBe('SEED-777');
    }
    expect(state.contractSendCalls.map((item) => item.method)).toContain('Approve');
    expect(state.contractSendCalls.map((item) => item.method)).toContain('Buy');
  });

  test('buySeed rejects when market price exceeds numeric force limit', async () => {
    state.fetchSeedInfoImpl = async () => ({
      status: 0,
      tokenPrice: { symbol: 'ELF', amount: 3 },
    });

    await expect(
      buySeed(
        makeConfig(),
        { symbol: 'ALPHA', issueTo: 'ELF_ISSUE_TO', force: 2 },
        false,
      ),
    ).rejects.toThrow('exceeding your limit');
  });

  test('createToken succeeds and reports synced for side-chain issue', async () => {
    const result = await createToken(
      makeConfig(),
      {
        symbol: 'TOK',
        tokenName: 'Token',
        seedSymbol: 'SEED-1',
        totalSupply: '10',
        decimals: 2,
        issuer: 'ELF_ISSUER',
        issueChain: 'tDVV',
        isBurnable: true,
        tokenImage: 'https://img.mock/token.png',
      },
      false,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transactionId).toBe('tx-create');
      expect(result.proxyIssuer).toBe('ELF_PROXY_ISSUER');
      expect(result.crossChainSynced).toBe(true);
    }
    expect(state.saveTokenInfosCalls).toHaveLength(1);
    expect(state.syncTokenCalls).toHaveLength(1);
    expect(state.syncResultExistLoopCalls).toHaveLength(1);
  });

  test('createToken degrades gracefully when auth missing and sync poll fails', async () => {
    state.fetchAuthTokenImpl = async () => '';
    state.syncResultExistLoopImpl = async () => {
      throw new Error('mock sync timeout');
    };

    const result = await createToken(
      makeConfig(),
      {
        symbol: 'TOK',
        tokenName: 'Token',
        seedSymbol: 'SEED-1',
        totalSupply: '10',
        decimals: 2,
        issuer: 'ELF_ISSUER',
        issueChain: 'tDVV',
        isBurnable: true,
        tokenImage: '',
      },
      false,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.crossChainSynced).toBe(false);
      expect(result.warning).toContain('cross-chain sync');
      expect(result.warnings.some((item) => item.includes('Auth token fetch failed'))).toBe(
        true,
      );
      expect(
        result.warnings.some((item) => item.includes('Cross-chain sync incomplete')),
      ).toBe(true);
    }
  });

  test('issueToken succeeds with inferred proxy issuer', async () => {
    const result = await issueToken(
      makeConfig(),
      {
        symbol: 'TOK',
        amount: 1,
        to: TEST_ADDRESS,
        memo: 'memo',
        chain: 'AELF',
      },
      false,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transactionId).toBe('tx-issue');
      expect(result.proxyIssuer).toBe('ELF_PROXY_ISSUER');
      expect(result.proxyAccountHash).toBe('deadbeef');
    }
    expect(state.contractSendCalls.map((item) => item.method)).toContain('ForwardCall');
  });

  test('issueToken skips token info query when issuer is provided explicitly', async () => {
    const result = await issueToken(
      makeConfig(),
      {
        symbol: 'TOK',
        amount: 1,
        to: TEST_ADDRESS,
        memo: '',
        chain: 'AELF',
        issuer: 'ELF_ISSUER_OVERRIDE',
      },
      false,
    );

    expect(result.success).toBe(true);
    const viewMethods = state.contractViewCalls.map((item) => item.method);
    expect(viewMethods.includes('GetTokenInfo')).toBe(false);
  });

  test('issueToken throws when proxy account hash cannot be resolved', async () => {
    state.callContractViewImpl = async (
      _rpcUrl: string,
      _contractAddress: string,
      method: string,
      _params: any,
    ) => {
      if (method === 'GetTokenInfo') {
        return { issuer: 'ELF_PROXY_ISSUER' };
      }
      if (method === 'GetProxyAccountByProxyAccountAddress') {
        return {};
      }
      return {};
    };

    await expect(
      issueToken(
        makeConfig(),
        {
          symbol: 'TOK',
          amount: 1,
          to: TEST_ADDRESS,
          memo: '',
          chain: 'AELF',
        },
        false,
      ),
    ).rejects.toThrow('Failed to get proxy account hash');
  });
});
