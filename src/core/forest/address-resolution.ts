import { CHAIN_SET, CONTRACT_VIEW_METHODS } from './constants';
import type { ContractExecutionMode } from './types';

export function normalizeChain(chain?: string): string {
  if (chain && CHAIN_SET.has(chain)) return chain;
  return 'AELF';
}

export function getContractMode(
  skillName: string,
  method: string,
): ContractExecutionMode {
  const views = CONTRACT_VIEW_METHODS[skillName];
  if (views?.has(method)) return 'view';
  if (method.startsWith('Get')) return 'view';
  return 'send';
}

export function pickContractAddress(
  contracts: Record<string, any>,
  keys: string[],
): string | '' {
  for (const key of keys) {
    const value = contracts[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
}

export function resolveContractAddress(
  skillName: string,
  chain: string,
  contracts: Record<string, any>,
): string | '' {
  switch (skillName) {
    case 'aelf-forest-contract-market':
      return chain === 'AELF'
        ? pickContractAddress(contracts, [
            'nftMarketMainAddress',
            'marketMainAddress',
            'marketAddress',
            'nftMarketAddress',
          ])
        : pickContractAddress(contracts, [
            'nftMarketSideAddress',
            'marketSideAddress',
            'sideChainMarketAddress',
          ]);
    case 'aelf-forest-contract-multitoken':
      return chain === 'AELF'
        ? pickContractAddress(contracts, ['mainChainAddress'])
        : pickContractAddress(contracts, ['sideChainAddress']);
    case 'aelf-forest-contract-token-adapter':
      return pickContractAddress(contracts, [
        'tokenAdapterMainAddress',
        'tokenAdapterAddress',
      ]);
    case 'aelf-forest-contract-proxy':
      return chain === 'AELF'
        ? pickContractAddress(contracts, ['proxyMainAddress'])
        : pickContractAddress(contracts, ['proxySideAddress']);
    case 'aelf-forest-contract-auction':
      return chain === 'AELF'
        ? pickContractAddress(contracts, [
            'auctionMainAddress',
            'seedAuctionMainAddress',
            'auctionAddress',
          ])
        : pickContractAddress(contracts, [
            'auctionSideAddress',
            'seedAuctionSideAddress',
          ]);
    case 'aelf-forest-contract-drop':
      return chain === 'AELF'
        ? pickContractAddress(contracts, ['dropMainAddress', 'dropAddress'])
        : pickContractAddress(contracts, ['dropSideAddress']);
    case 'aelf-forest-contract-whitelist':
      return chain === 'AELF'
        ? pickContractAddress(contracts, [
            'whitelistMainAddress',
            'whitelistAddress',
          ])
        : pickContractAddress(contracts, ['whitelistSideAddress']);
    case 'aelf-forest-contract-miniapp':
      return chain === 'AELF'
        ? pickContractAddress(contracts, [
            'miniAppMainAddress',
            'treePointsMainAddress',
            'miniAppAddress',
          ])
        : pickContractAddress(contracts, [
            'miniAppSideAddress',
            'treePointsSideAddress',
          ]);
    default:
      return '';
  }
}
