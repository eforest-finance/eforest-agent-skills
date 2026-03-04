import { describe, expect, test } from 'bun:test';
import { getReadonlyNetworkConfig } from '../../lib/config';

describe('getReadonlyNetworkConfig', () => {
  test('builds readonly config without signer env', async () => {
    delete process.env.AELF_PRIVATE_KEY;
    delete process.env.EFOREST_PRIVATE_KEY;
    delete process.env.PORTKEY_PRIVATE_KEY;
    delete process.env.PORTKEY_CA_HASH;
    delete process.env.PORTKEY_CA_ADDRESS;
    delete process.env.PORTKEY_CA_KEYSTORE_PASSWORD;
    delete process.env.PORTKEY_WALLET_PASSWORD;

    const config = await getReadonlyNetworkConfig({ env: 'mainnet' });
    expect(config.apiUrl).toBeDefined();
    expect(config.cmsUrl).toBeDefined();
    expect(config.rpcUrls.AELF).toBeDefined();
    expect((config as any).walletAddress).toBeUndefined();
    expect((config as any).signer).toBeUndefined();
  });
});
