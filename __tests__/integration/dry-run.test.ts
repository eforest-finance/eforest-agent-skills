/**
 * Integration Tests (Mocked) — Dry-run mode and error handling
 *
 * Tests core functions with mock config (no real RPC calls).
 *
 * Run: cd scripts/skills && bun test
 */
import { describe, test, expect } from 'bun:test';

import { getWallet } from '../../lib/aelf-client';
import { buySeed } from '../../src/core/seed';
import { createToken } from '../../src/core/token';
import { issueToken } from '../../src/core/issue';
import type { ResolvedConfig } from '../../lib/types';

const TEST_PRIVATE_KEY =
  'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1f2';

function makeMockConfig(overrides?: Partial<any>): ResolvedConfig {
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
      symbolRegisterMainAddress: 'mock_symbol_register',
      tokenAdapterMainAddress: 'mock_token_adapter',
      proxyMainAddress: 'mock_proxy_main',
      proxySideAddress: 'mock_proxy_side',
    },
    wallet,
    walletAddress: wallet.address,
    ...overrides,
  } as ResolvedConfig;
}

// ============================================================================
// buySeed - dry run
// ============================================================================

describe('buySeed - dry run', () => {
  test('returns full steps with price info', async () => {
    const config = makeMockConfig();
    const result = await buySeed(
      config,
      { symbol: 'SEED-100', issueTo: 'addr123' },
      true,
    );
    expect(result.dryRun).toBe(true);
    expect((result as any).steps.length).toBeGreaterThanOrEqual(4);

    const actions = (result as any).steps.map((s: any) => s.action);
    expect(actions).toContain('Query SEED price & availability');
    expect(actions).toContain('Check ELF balance');
    expect(actions).toContain('Approve ELF to SymbolRegister (if needed)');
    expect(actions).toContain('Buy SEED');

    const buyStep = (result as any).steps.find(
      (s: any) => s.method === 'Buy',
    );
    expect(buyStep.params.symbol).toBe('SEED-100');
  });
});

// ============================================================================
// buySeed - price safety
// ============================================================================

describe('buySeed - price safety', () => {
  test('dry-run includes price fields in output', async () => {
    const config = makeMockConfig();
    const result = await buySeed(
      config,
      { symbol: 'SEED-ABCDEF', issueTo: 'addr' },
      true,
    );
    expect('priceELF' in result).toBe(true);
    expect('priceSymbol' in result).toBe(true);
  });

  test('refuses to buy without --force (outputs price info)', async () => {
    const config = makeMockConfig();
    await expect(
      buySeed(config, { symbol: 'SEED-1', issueTo: 'addr' }, false),
    ).rejects.toThrow('Purchase requires explicit confirmation');
  });

  test('refuses to buy when force=false', async () => {
    const config = makeMockConfig();
    await expect(
      buySeed(
        config,
        { symbol: 'SEED-1', issueTo: 'addr', force: false },
        false,
      ),
    ).rejects.toThrow('Purchase requires explicit confirmation');
  });

  test('proceeds with --force (boolean true)', async () => {
    const config = makeMockConfig();
    await expect(
      buySeed(
        config,
        { symbol: 'SEED-1', issueTo: 'addr', force: true },
        false,
      ),
    ).rejects.not.toThrow('Purchase requires explicit confirmation');
  });

  test('proceeds with --force <maxPrice> when price is unknown', async () => {
    const config = makeMockConfig();
    await expect(
      buySeed(
        config,
        { symbol: 'SEED-1', issueTo: 'addr', force: 2 },
        false,
      ),
    ).rejects.not.toThrow('Purchase requires explicit confirmation');
  });
});

// ============================================================================
// createToken - dry run
// ============================================================================

describe('createToken - dry run', () => {
  test('returns all steps without executing', async () => {
    const config = makeMockConfig();
    const result = await createToken(
      config,
      {
        symbol: 'TEST',
        tokenName: 'Test Token',
        seedSymbol: 'SEED-1',
        totalSupply: '1000',
        decimals: 8,
        issuer: 'addr',
        issueChain: 'AELF',
        isBurnable: true,
        tokenImage: 'https://img.png',
      },
      true,
    );
    expect(result.dryRun).toBe(true);
    expect((result as any).steps.length).toBeGreaterThanOrEqual(4);

    const actions = (result as any).steps.map((s: any) => s.action);
    expect(actions).toContain('Check SEED allowance');
    expect(actions).toContain('Approve SEED (if needed)');
    expect(actions).toContain('Create Token via TokenAdapter');
    expect(actions).toContain('Save token info to backend');
    expect(actions).toContain('Sync token cross-chain');
  });

  test('includes correct issueChainId in CreateToken params', async () => {
    const config = makeMockConfig();
    const result = await createToken(
      config,
      {
        symbol: 'ABC',
        tokenName: 'ABC Token',
        seedSymbol: 'SEED-2',
        totalSupply: '500',
        decimals: 2,
        issuer: 'addr',
        issueChain: 'tDVV',
        isBurnable: false,
        tokenImage: '',
      },
      true,
    );
    const createStep = (result as any).steps.find(
      (s: any) => s.method === 'CreateToken',
    );
    expect(createStep).toBeDefined();
    expect(createStep.params.issueChainId).toBe(1866392); // tDVV
    expect(createStep.params.isBurnable).toBe(false);
    expect(createStep.params.totalSupply).toBe('50000'); // 500 * 10^2
  });
});

// ============================================================================
// issueToken - dry run
// ============================================================================

describe('issueToken - dry run', () => {
  test('returns Proxy ForwardCall steps for MainChain issue', async () => {
    const config = makeMockConfig();
    const result = await issueToken(
      config,
      {
        symbol: 'TEST',
        amount: 100,
        to: 'recipient_addr',
        memo: 'test memo',
        chain: 'AELF',
      },
      true,
    );
    expect(result.dryRun).toBe(true);
    expect((result as any).steps).toHaveLength(3);

    const actions = (result as any).steps.map((s: any) => s.action);
    expect(actions).toContain('Get token info (find proxy issuer)');
    expect(actions).toContain('Get proxy account hash');
    expect(actions).toContain('Encode IssueInput and ForwardCall via Proxy');

    const forwardStep = (result as any).steps.find(
      (s: any) => s.method === 'ForwardCall',
    );
    expect(forwardStep).toBeDefined();
    expect(forwardStep.params.methodName).toBe('Issue');
  });

  test('returns steps for SideChain issue', async () => {
    const config = makeMockConfig();
    const result = await issueToken(
      config,
      {
        symbol: 'TEST',
        amount: 50,
        to: 'addr',
        memo: '',
        chain: 'tDVV',
      },
      true,
    );
    expect(result.dryRun).toBe(true);
    expect((result as any).steps).toHaveLength(3);
    const forwardStep = (result as any).steps.find(
      (s: any) => s.method === 'ForwardCall',
    );
    expect(forwardStep.params.contractAddress).toBe('mock_multi_token_side');
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('Error handling', () => {
  test('buySeed dry-run succeeds even without contract address', async () => {
    const config = makeMockConfig({
      contracts: { symbolRegisterMainAddress: undefined },
    });
    const result = await buySeed(
      config,
      { symbol: 'SEED-1', issueTo: 'addr' },
      true,
    );
    expect(result.dryRun).toBe(true);
  });

  test('buySeed throws when contract address is missing (non dry-run, with --force)', async () => {
    const config = makeMockConfig({
      contracts: { symbolRegisterMainAddress: undefined },
    });
    await expect(
      buySeed(
        config,
        { symbol: 'SEED-1', issueTo: 'addr', force: 2 },
        false,
      ),
    ).rejects.toThrow('symbolRegisterMainAddress not found');
  });

  test('createToken throws when tokenAdapter address is missing (non dry-run)', async () => {
    const config = makeMockConfig({
      contracts: {
        tokenAdapterMainAddress: undefined,
        mainChainAddress: 'addr',
      },
    });
    await expect(
      createToken(
        config,
        {
          symbol: 'T',
          tokenName: 'T',
          seedSymbol: 'S',
          totalSupply: '1',
          decimals: 0,
          issuer: 'a',
          issueChain: 'AELF',
          isBurnable: true,
          tokenImage: '',
        },
        false,
      ),
    ).rejects.toThrow('tokenAdapterMainAddress not found');
  });

  test('createToken throws when multiToken address is missing (non dry-run)', async () => {
    const config = makeMockConfig({
      contracts: {
        tokenAdapterMainAddress: 'addr',
        mainChainAddress: undefined,
      },
    });
    await expect(
      createToken(
        config,
        {
          symbol: 'T',
          tokenName: 'T',
          seedSymbol: 'S',
          totalSupply: '1',
          decimals: 0,
          issuer: 'a',
          issueChain: 'AELF',
          isBurnable: true,
          tokenImage: '',
        },
        false,
      ),
    ).rejects.toThrow('mainChainAddress not found');
  });

  test('issueToken throws when contract address is missing for chain (non dry-run)', async () => {
    const config = makeMockConfig({
      contracts: { sideChainAddress: undefined, proxySideAddress: 'proxy' },
    });
    await expect(
      issueToken(
        config,
        { symbol: 'T', amount: 1, to: 'a', memo: '', chain: 'tDVV' },
        false,
      ),
    ).rejects.toThrow(
      'MultiToken contract address not found for chain "tDVV"',
    );
  });

  test('issueToken throws when proxy address is missing for chain (non dry-run)', async () => {
    const config = makeMockConfig({
      contracts: {
        sideChainAddress: 'addr',
        proxySideAddress: undefined,
      },
    });
    await expect(
      issueToken(
        config,
        { symbol: 'T', amount: 1, to: 'a', memo: '', chain: 'tDVV' },
        false,
      ),
    ).rejects.toThrow(
      'Proxy contract address not found for chain "tDVV"',
    );
  });

  test('issueToken throws when rpcUrl is missing for chain (non dry-run)', async () => {
    const config = makeMockConfig({
      rpcUrls: { AELF: 'url', tDVV: '', tDVW: '' },
      contracts: {
        sideChainAddress: 'addr',
        proxySideAddress: 'proxy',
      },
    });
    await expect(
      issueToken(
        config,
        { symbol: 'T', amount: 1, to: 'a', memo: '', chain: 'tDVV' },
        false,
      ),
    ).rejects.toThrow('RPC URL not configured for chain "tDVV"');
  });
});
