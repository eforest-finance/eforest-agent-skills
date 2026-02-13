/**
 * Integration Tests — Config resolution (getNetworkConfig)
 *
 * Run: cd scripts/skills && bun test
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

import { getNetworkConfig } from '../../lib/config';

const TEST_PRIVATE_KEY =
  'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1f2';

describe('getNetworkConfig', () => {
  const envKeys = [
    'AELF_PRIVATE_KEY',
    'AELF_ENV',
    'AELF_API_URL',
    'AELF_RPC_URL',
    'EFOREST_NETWORK',
    'EFOREST_API_URL',
    'EFOREST_RPC_URL',
    // Portkey CA env vars — must be cleaned to avoid createSignerFromEnv picking CA mode
    'PORTKEY_PRIVATE_KEY',
    'PORTKEY_CA_HASH',
    'PORTKEY_CA_ADDRESS',
  ];
  const savedEnvVars: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnvVars[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnvVars[key] !== undefined) {
        process.env[key] = savedEnvVars[key];
      } else {
        delete process.env[key];
      }
    }
  });

  test('throws for unknown env', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    await expect(getNetworkConfig({ env: 'staging' })).rejects.toThrow(
      'Unknown env "staging"',
    );
  });

  test('uses mainnet preset by default', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    delete process.env.AELF_ENV;
    delete process.env.EFOREST_NETWORK;
    const config = await getNetworkConfig({});
    expect(config.apiUrl).toContain('eforest.finance');
    expect(config.walletAddress).toBeDefined();
  });

  test('respects apiUrl option override', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    const config = await getNetworkConfig({
      apiUrl: 'https://custom.api',
    });
    expect(config.apiUrl).toBe('https://custom.api');
  });

  test('respects rpcUrl option override', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    const config = await getNetworkConfig({
      rpcUrl: 'https://custom-rpc.io',
    });
    expect(config.rpcUrls['AELF']).toBe('https://custom-rpc.io');
  });

  test('respects AELF_ENV env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.AELF_ENV = 'testnet';
    delete process.env.EFOREST_NETWORK;
    const config = await getNetworkConfig({});
    expect(config.apiUrl).toContain('test.eforest.finance');
  });

  test('respects EFOREST_NETWORK env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    delete process.env.AELF_ENV;
    process.env.EFOREST_NETWORK = 'testnet';
    const config = await getNetworkConfig({});
    expect(config.apiUrl).toContain('test.eforest.finance');
  });

  test('env option overrides AELF_ENV env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.AELF_ENV = 'testnet';
    const config = await getNetworkConfig({ env: 'mainnet' });
    expect(config.apiUrl).not.toContain('test.eforest.finance');
  });

  test('respects AELF_API_URL env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.AELF_API_URL = 'https://env-api.test';
    const config = await getNetworkConfig({});
    expect(config.apiUrl).toBe('https://env-api.test');
  });

  test('apiUrl option overrides AELF_API_URL env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.AELF_API_URL = 'https://env-api.test';
    const config = await getNetworkConfig({
      apiUrl: 'https://cli-api.test',
    });
    expect(config.apiUrl).toBe('https://cli-api.test');
  });

  test('respects AELF_RPC_URL env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.AELF_RPC_URL = 'https://env-rpc.test';
    const config = await getNetworkConfig({});
    expect(config.rpcUrls['AELF']).toBe('https://env-rpc.test');
  });

  test('rpcUrl option overrides AELF_RPC_URL env var', async () => {
    process.env.AELF_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.AELF_RPC_URL = 'https://env-rpc.test';
    const config = await getNetworkConfig({
      rpcUrl: 'https://cli-rpc.test',
    });
    expect(config.rpcUrls['AELF']).toBe('https://cli-rpc.test');
  });
});
