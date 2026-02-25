import { describe, expect, test } from 'bun:test';

import {
  dispatchForestSkill,
  type ApiInvokeRequest,
  type ApiRoute,
  type ContractExecutionMode,
  type ContractInvokeRequest,
  type ForestDispatchContext,
} from '../../src/core/forest';

describe('forest facade export compatibility', () => {
  test('keeps dispatchForestSkill export', () => {
    expect(typeof dispatchForestSkill).toBe('function');
  });

  test('keeps key type exports', () => {
    const mode: ContractExecutionMode = 'send';
    const route: ApiRoute = {
      method: 'GET',
      path: '/mock/path',
      auth: true,
    };
    const contractRequest: ContractInvokeRequest = {
      skillName: 'aelf-forest-contract-market',
      method: 'MakeOffer',
      args: {},
      chain: 'AELF',
      contractAddress: 'mock-address',
      rpcUrl: 'https://mock-rpc',
      mode,
      config: {} as any,
    };
    const apiRequest: ApiInvokeRequest = {
      skillName: 'aelf-forest-api-market',
      action: 'fetchTokens',
      params: {},
      route,
      config: {} as any,
    };
    const context: ForestDispatchContext = {
      config: {} as any,
      contractInvoker: async () => contractRequest,
      apiInvoker: async () => apiRequest,
    };

    expect(mode).toBe('send');
    expect(route.method).toBe('GET');
    expect(typeof context.contractInvoker).toBe('function');
    expect(typeof context.apiInvoker).toBe('function');
  });
});
