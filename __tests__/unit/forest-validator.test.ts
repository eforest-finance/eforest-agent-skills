import { describe, test, expect } from 'bun:test';

import { validateForestSchema } from '../../lib/forest-validator';

describe('forest schema validator', () => {
  test('accepts valid workflow payload', () => {
    const result = validateForestSchema('schema.workflow.createItem.in.v1', {
      env: 'mainnet',
      payload: {
        symbol: 'NFT-1',
        tokenName: 'NFT #1',
        owner: 'owner-address',
        issuer: 'issuer-address',
        issueChainId: 'AELF',
        totalSupply: 1,
        externalInfo: {},
      },
    });

    expect(result.valid).toBe(true);
  });

  test('rejects missing required workflow payload fields', () => {
    const result = validateForestSchema('schema.workflow.createItem.in.v1', {
      env: 'mainnet',
      payload: {
        symbol: 'NFT-1',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rejects invalid enum value', () => {
    const result = validateForestSchema('schema.workflow.createItem.in.v1', {
      env: 'mainnet',
      payload: {
        symbol: 'NFT-1',
        tokenName: 'NFT #1',
        owner: 'owner-address',
        issuer: 'issuer-address',
        issueChainId: 'ETH',
        totalSupply: 1,
        externalInfo: {},
      },
    });

    expect(result.valid).toBe(false);
  });

  test('rejects method schema missing action/method', () => {
    const apiResult = validateForestSchema('schema.method.api.market.in.v1', {
      env: 'mainnet',
      params: {},
    });
    const contractResult = validateForestSchema(
      'schema.method.contract.market.in.v1',
      {
        env: 'mainnet',
        args: {},
      },
    );

    expect(apiResult.valid).toBe(false);
    expect(contractResult.valid).toBe(false);
  });
});
