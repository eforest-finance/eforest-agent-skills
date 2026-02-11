/**
 * Unit Tests — Validators, Chain utils, Wallet
 *
 * Run: cd scripts/skills && bun test
 */
import { describe, test, expect, afterEach } from 'bun:test';

import {
  getChainIdValue,
  validateChain,
  validateCreateTokenParams,
  validateIssueTokenParams,
  validateBuySeedParams,
} from '../../lib/types';
import { getWallet } from '../../lib/aelf-client';

// ============================================================================
// Chain ID Mapping
// ============================================================================

describe('getChainIdValue', () => {
  test('returns correct value for AELF', () => {
    expect(getChainIdValue('AELF')).toBe(9992731);
  });

  test('returns correct value for tDVV', () => {
    expect(getChainIdValue('tDVV')).toBe(1866392);
  });

  test('returns correct value for tDVW', () => {
    expect(getChainIdValue('tDVW')).toBe(1931928);
  });

  test('throws for unknown chain', () => {
    expect(() => getChainIdValue('INVALID')).toThrow('Unknown chain: INVALID');
  });
});

// ============================================================================
// Chain Validation
// ============================================================================

describe('validateChain', () => {
  test('accepts valid chains', () => {
    expect(() => validateChain('AELF')).not.toThrow();
    expect(() => validateChain('tDVV')).not.toThrow();
    expect(() => validateChain('tDVW')).not.toThrow();
  });

  test('rejects invalid chain', () => {
    expect(() => validateChain('ETH')).toThrow('Invalid chain "ETH"');
  });
});

// ============================================================================
// Wallet
// ============================================================================

describe('getWallet', () => {
  const originalEnv = process.env.AELF_PRIVATE_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.AELF_PRIVATE_KEY = originalEnv;
    } else {
      delete process.env.AELF_PRIVATE_KEY;
    }
  });

  test('throws when no private key provided', () => {
    delete process.env.AELF_PRIVATE_KEY;
    delete process.env.EFOREST_PRIVATE_KEY;
    expect(() => getWallet()).toThrow('Private key is required');
  });

  test('creates wallet from env var', () => {
    const testKey =
      'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1';
    process.env.AELF_PRIVATE_KEY = testKey;
    const wallet = getWallet();
    expect(wallet).toBeDefined();
    expect(wallet.address).toBeDefined();
    expect(typeof wallet.address).toBe('string');
  });

  test('creates wallet from argument', () => {
    delete process.env.AELF_PRIVATE_KEY;
    const testKey =
      'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1';
    const wallet = getWallet(testKey);
    expect(wallet).toBeDefined();
    expect(wallet.address).toBeDefined();
  });

  test('env var takes priority over argument', () => {
    const envKey =
      'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1';
    const argKey =
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    process.env.AELF_PRIVATE_KEY = envKey;
    const wallet = getWallet(argKey);
    const envWallet = getWallet(envKey);
    expect(wallet.address).toBe(envWallet.address);
  });
});

// ============================================================================
// validateCreateTokenParams
// ============================================================================

describe('validateCreateTokenParams', () => {
  const validParams = {
    symbol: 'TEST',
    tokenName: 'Test Token',
    seedSymbol: 'SEED-123',
    totalSupply: '1000000',
    decimals: 8,
    issueChain: 'AELF',
  };

  test('passes for valid params', () => {
    expect(() => validateCreateTokenParams(validParams)).not.toThrow();
  });

  test('passes without issuer (optional, defaults to wallet address)', () => {
    expect(() => validateCreateTokenParams(validParams)).not.toThrow();
  });

  test('fails when symbol is missing', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, symbol: '' }),
    ).toThrow('Missing required parameter');
  });

  test('fails when tokenName is missing', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, tokenName: '' }),
    ).toThrow('Missing required parameter');
  });

  test('fails when decimals is out of range', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, decimals: 19 }),
    ).toThrow('Decimals must be an integer between 0 and 18');
  });

  test('fails when decimals is negative', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, decimals: -1 }),
    ).toThrow('Decimals must be an integer between 0 and 18');
  });

  test('allows decimals of 0', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, decimals: 0 }),
    ).not.toThrow();
  });

  test('allows decimals of 18', () => {
    expect(() =>
      validateCreateTokenParams({
        ...validParams,
        decimals: 18,
        totalSupply: '9',
      }),
    ).not.toThrow();
  });

  test('fails for non-integer decimals', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, decimals: 8.5 }),
    ).toThrow('Decimals must be an integer between 0 and 18');
  });

  test('fails when totalSupply is zero', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, totalSupply: '0' }),
    ).toThrow('Total supply must be a positive integer');
  });

  test('fails when totalSupply * 10^decimals exceeds max', () => {
    expect(() =>
      validateCreateTokenParams({
        ...validParams,
        totalSupply: '92233720368547758080',
        decimals: 0,
      }),
    ).toThrow('Total supply * 10^decimals exceeds max');
  });

  test('fails for invalid issueChain', () => {
    expect(() =>
      validateCreateTokenParams({ ...validParams, issueChain: 'ETH' }),
    ).toThrow('Invalid chain "ETH"');
  });
});

// ============================================================================
// validateIssueTokenParams
// ============================================================================

describe('validateIssueTokenParams', () => {
  const validParams = {
    symbol: 'TEST',
    amount: 100,
    to: 'address_here',
    chain: 'AELF',
  };

  test('passes for valid params', () => {
    expect(() => validateIssueTokenParams(validParams)).not.toThrow();
  });

  test('fails when symbol is missing', () => {
    expect(() =>
      validateIssueTokenParams({ ...validParams, symbol: '' }),
    ).toThrow('Missing required parameter: --symbol');
  });

  test('fails when amount is zero', () => {
    expect(() =>
      validateIssueTokenParams({ ...validParams, amount: 0 }),
    ).toThrow('Amount must be a positive number');
  });

  test('fails when amount is negative', () => {
    expect(() =>
      validateIssueTokenParams({ ...validParams, amount: -10 }),
    ).toThrow('Amount must be a positive number');
  });

  test('fails for invalid chain', () => {
    expect(() =>
      validateIssueTokenParams({ ...validParams, chain: 'BSC' }),
    ).toThrow('Invalid chain "BSC"');
  });
});

// ============================================================================
// validateBuySeedParams
// ============================================================================

describe('validateBuySeedParams', () => {
  test('passes for valid params', () => {
    expect(() =>
      validateBuySeedParams({ symbol: 'SEED-1', issuer: 'addr' }),
    ).not.toThrow();
  });

  test('fails when symbol is missing', () => {
    expect(() => validateBuySeedParams({ issuer: 'addr' })).toThrow(
      'Missing required parameter: --symbol',
    );
  });

  test('fails when issuer is missing', () => {
    expect(() => validateBuySeedParams({ symbol: 'SEED-1' })).toThrow(
      'Missing required parameter: --issuer',
    );
  });
});
