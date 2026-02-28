/**
 * Environment presets for public/mainnet/testnet endpoints.
 */

export interface EnvPreset {
  apiUrl: string;
  cmsUrl: string;
  connectUrl: string;
  rpcUrlAELF: string;
  rpcUrlTDVV: string;
  rpcUrlTDVW: string;
}

export const ENV_PRESETS: Record<string, EnvPreset> = {
  mainnet: {
    apiUrl: 'https://www.eforest.finance/api',
    cmsUrl: 'https://www.eforest.finance/cms',
    connectUrl: 'https://www.eforest.finance/connect',
    rpcUrlAELF: 'https://aelf-public-node.aelf.io',
    rpcUrlTDVV: 'https://tdvv-public-node.aelf.io',
    rpcUrlTDVW: '',
  },
  testnet: {
    apiUrl: 'https://test.eforest.finance/api',
    cmsUrl: 'https://test.eforest.finance/cms',
    connectUrl: 'https://test.eforest.finance/connect',
    rpcUrlAELF: 'https://aelf-test-node.aelf.io',
    rpcUrlTDVV: 'https://tdvv-test-node.aelf.io',
    rpcUrlTDVW: 'https://tdvw-test-node.aelf.io',
  },
};
