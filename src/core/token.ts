/**
 * Core — create-token business logic.
 *
 * Pure logic: no console.log / process.exit. All warnings collected in result.
 * Throws Error on fatal failures.
 */

import type {
  ResolvedConfig,
  CreateTokenParams,
  CreateTokenResult,
  CreateTokenDryRunResult,
  CreateTokenContractParams,
  DryRunStep,
  SyncChainParams,
} from '../../lib/types';
import { getChainIdValue } from '../../lib/types';
import { callContractSend, callContractView } from '../../lib/aelf-client';
import {
  createApiClient,
  fetchAuthToken,
  saveTokenInfos,
  syncToken,
  syncResultExistLoop,
} from '../../lib/api-client';

export async function createToken(
  config: ResolvedConfig,
  opts: CreateTokenParams,
  dryRun = false,
): Promise<CreateTokenResult | CreateTokenDryRunResult> {
  const warnings: string[] = [];
  const issueChainId = getChainIdValue(opts.issueChain);

  const totalSupplyWithDecimals = String(
    BigInt(opts.totalSupply) * BigInt(10 ** opts.decimals),
  );

  const tokenAdapterAddr =
    config.contracts.tokenAdapterMainAddress || '<tokenAdapterMainAddress>';
  const multiTokenAddr =
    config.contracts.mainChainAddress || '<mainChainAddress>';

  const createParams: CreateTokenContractParams = {
    symbol: opts.symbol,
    tokenName: opts.tokenName,
    seedSymbol: opts.seedSymbol,
    totalSupply: totalSupplyWithDecimals,
    decimals: opts.decimals,
    issuer: opts.issuer,
    isBurnable: opts.isBurnable,
    issueChainId,
    owner: config.walletAddress,
    externalInfo: {
      value: { __ft_image_uri: opts.tokenImage || '' },
    },
  };

  const steps: DryRunStep[] = [
    {
      action: 'Check SEED allowance',
      contract: 'MultiToken',
      method: 'GetAllowance',
      params: {
        symbol: opts.seedSymbol,
        owner: config.walletAddress,
        spender: tokenAdapterAddr,
      },
    },
    {
      action: 'Approve SEED (if needed)',
      contract: 'MultiToken',
      method: 'Approve',
      params: {
        symbol: opts.seedSymbol,
        spender: tokenAdapterAddr,
        amount: '1',
      },
    },
    {
      action: 'Create Token via TokenAdapter',
      contract: 'TokenAdapter',
      method: 'CreateToken',
      params: createParams,
    },
    {
      action: 'Save token info to backend',
      api: 'POST /app/nft/nft-infos',
      params: {
        chainId: opts.issueChain,
        symbol: opts.symbol,
        previewImage: opts.tokenImage,
      },
    },
    {
      action: 'Sync token cross-chain',
      api: 'POST /app/nft/sync',
      params: {
        fromChainId: 'AELF',
        toChainId: opts.issueChain,
        symbol: opts.symbol,
      },
    },
  ];

  if (dryRun) {
    return { dryRun: true, steps };
  }

  // Validate contract addresses
  if (!config.contracts.tokenAdapterMainAddress) {
    throw new Error('tokenAdapterMainAddress not found in config.');
  }
  if (!config.contracts.mainChainAddress) {
    throw new Error('mainChainAddress not found in config.');
  }

  const rpcUrl = config.rpcUrls['AELF'];

  // Check SEED allowance
  const allowance = await callContractView(
    rpcUrl,
    multiTokenAddr,
    'GetAllowance',
    {
      symbol: opts.seedSymbol,
      owner: config.walletAddress,
      spender: tokenAdapterAddr,
    },
  );

  // Approve if needed
  if (Number(allowance?.allowance ?? 0) < 1) {
    await callContractSend(
      rpcUrl,
      multiTokenAddr,
      'Approve',
      {
        spender: tokenAdapterAddr,
        symbol: opts.seedSymbol,
        amount: '1',
      },
      config.signer,
    );
  }

  // Create token
  const createResult = await callContractSend(
    rpcUrl,
    tokenAdapterAddr,
    'CreateToken',
    createParams,
    config.signer,
  );

  const createTxId = createResult.TransactionId;

  // Query proxy issuer from on-chain GetTokenInfo
  let proxyIssuer = '';
  try {
    const tokenInfo = await callContractView(
      rpcUrl,
      multiTokenAddr,
      'GetTokenInfo',
      { symbol: opts.symbol },
    );
    proxyIssuer =
      typeof tokenInfo?.issuer === 'string' ? tokenInfo.issuer : '';
  } catch (err: any) {
    warnings.push(
      `GetTokenInfo failed: ${err.message}. proxyIssuer unknown.`,
    );
  }

  // Save token info to backend
  const authToken = await fetchAuthToken(config.connectUrl, config.wallet);
  if (!authToken) {
    warnings.push('Auth token fetch failed. Backend save/sync may fail.');
  }
  const api = createApiClient(config.apiUrl, authToken);

  try {
    await saveTokenInfos(api, {
      chainId: opts.issueChain,
      symbol: opts.symbol,
      transactionId: createTxId,
      previewImage: opts.tokenImage || '',
    });
  } catch (err: any) {
    warnings.push(`saveTokenInfos failed: ${err.message}. Continuing...`);
  }

  // Cross-chain sync (graceful degradation)
  let crossChainSynced = opts.issueChain === 'AELF';

  if (opts.issueChain !== 'AELF') {
    const syncParams: SyncChainParams = {
      fromChainId: 'AELF',
      toChainId: opts.issueChain,
      symbol: opts.symbol,
      txHash: createTxId,
    };

    try {
      await syncToken(api, syncParams);
    } catch (err: any) {
      warnings.push(
        `syncToken trigger failed: ${err.message}. Continuing...`,
      );
    }

    try {
      await syncResultExistLoop(api, opts.issueChain, opts.symbol);
      crossChainSynced = true;
    } catch (syncErr: any) {
      warnings.push(
        `Cross-chain sync incomplete: ${syncErr.message}. ` +
          `Token created on MainChain (txHash=${createTxId}) but may not yet appear on ${opts.issueChain}.`,
      );
    }
  }

  return {
    success: true,
    transactionId: createTxId,
    proxyIssuer,
    crossChainSynced,
    ...(crossChainSynced
      ? {}
      : {
          warning: `Token created on MainChain but cross-chain sync to ${opts.issueChain} timed out. It may appear later. Use the createTxId for manual retry.`,
        }),
    data: {
      symbol: opts.symbol,
      tokenName: opts.tokenName,
      issueChain: opts.issueChain,
      totalSupply: opts.totalSupply,
      decimals: opts.decimals,
    },
    warnings,
  };
}
