/**
 * Forest skill dispatcher.
 */

import axios from 'axios';

import { callContractSend, callContractView } from '../../lib/aelf-client';
import { createApiClient, fetchAuthToken } from '../../lib/api-client';
import type { ResolvedConfig } from '../../lib/types';
import {
  buildTraceId,
  ensureInputEnvelope,
  failureEnvelope,
  isFailureEnvelope,
  successEnvelope,
  type ForestEnvelope,
  type ForestFailureCode,
  type ForestInputEnvelope,
} from '../../lib/forest-envelope';
import { Config } from '../../lib/forest-service';
import { getForestSkill } from '../../lib/forest-skill-registry';
import { validateForestSchema } from '../../lib/forest-validator';

export type ContractExecutionMode = 'send' | 'view';

export interface ContractInvokeRequest {
  skillName: string;
  method: string;
  args: Record<string, any>;
  chain: string;
  contractAddress: string;
  rpcUrl: string;
  mode: ContractExecutionMode;
  config: ResolvedConfig;
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  auth?: boolean;
}

export interface ApiInvokeRequest {
  skillName: string;
  action: string;
  params: Record<string, any>;
  route: ApiRoute;
  config: ResolvedConfig;
}

export interface ForestDispatchContext {
  config: ResolvedConfig;
  contractInvoker?: (request: ContractInvokeRequest) => Promise<any>;
  apiInvoker?: (request: ApiInvokeRequest) => Promise<any>;
}

interface ErrorMapping {
  code: ForestFailureCode;
  message: string;
  retryable?: boolean;
  maintenance?: boolean;
  details?: Record<string, any>;
}

const CHAIN_SET = new Set(['AELF', 'tDVV', 'tDVW']);

const CONTRACT_VIEW_METHODS: Record<string, Set<string>> = {
  'aelf-forest-contract-market': new Set([
    'GetListedNFTInfoList',
    'GetTotalOfferAmount',
    'GetTotalEffectiveListedNFTAmount',
  ]),
  'aelf-forest-contract-multitoken': new Set([
    'GetBalance',
    'GetTokenInfo',
    'GetAllowance',
  ]),
  'aelf-forest-contract-token-adapter': new Set([]),
  'aelf-forest-contract-proxy': new Set([
    'GetProxyAccountByProxyAccountAddress',
  ]),
  'aelf-forest-contract-auction': new Set([]),
  'aelf-forest-contract-drop': new Set([]),
  'aelf-forest-contract-whitelist': new Set([
    'GetAddressFromWhitelist',
    'GetWhitelist',
    'GetTagInfoFromWhitelist',
    'GetWhitelistDetail',
    'GetWhitelistId',
    'GetTagInfoListByWhitelist',
  ]),
  'aelf-forest-contract-miniapp': new Set([]),
};

const DROP_ACTION_MAP: Record<string, string> = {
  list: 'fetchDropList',
  detail: 'fetchDropDetail',
  quota: 'fetchDropQuota',
  recommendation: 'fetchRecommendAction',
};

const WHITELIST_READ_METHOD_MAP: Record<string, string> = {
  getWhitelist: 'GetWhitelist',
  getWhitelistDetail: 'GetWhitelistDetail',
  getAddressFromWhitelist: 'GetAddressFromWhitelist',
  getTagInfoFromWhitelist: 'GetTagInfoFromWhitelist',
  getWhitelistId: 'GetWhitelistId',
  getTagInfoListByWhitelist: 'GetTagInfoListByWhitelist',
};

const WHITELIST_MANAGE_METHOD_MAP: Record<string, string> = {
  enable: 'EnableWhitelist',
  disable: 'DisableWhitelist',
  addAddressInfo: 'AddAddressInfoListToWhitelist',
  removeInfo: 'RemoveInfoFromWhitelist',
  updateExtraInfo: 'UpdateExtraInfo',
  addExtraInfo: 'AddExtraInfo',
  removeTagInfo: 'RemoveTagInfo',
  reset: 'ResetWhitelist',
};

const AI_RETRY_ACTION_MAP: Record<string, string> = {
  retryByTransactionId: 'fetchRetryGenerateAIArts',
  listFailed: 'fetchFailedAIArtsNFT',
  listImages: 'fetchAiImages',
  updateImageStatus: 'updateAiImagesStatus',
};

const PLATFORM_ACTION_MAP: Record<string, string> = {
  create: 'fetchCreatePlatformNFT',
  info: 'fetchCreatePlatformNFTInfo',
};

const MINIAPP_API_ACTION_MAP: Record<string, string> = {
  userInfo: 'fetchMiniAppUserInfo',
  watering: 'fetchMiniAppWatering',
  claim: 'fetchMiniAppClaim',
  levelUpdate: 'fetchMiniAppLevelUpdate',
  activityList: 'fetchMiniAppActivityList',
  activityDetail: 'fetchMiniAppActivityDetail',
  pointsConvert: 'fetchMiniAppPointsConvert',
  friendList: 'fetchMiniAppFriendList',
};

const MINIAPP_ONCHAIN_METHOD_MAP: Record<string, string> = {
  onchainAddPoints: 'AddTreePoints',
  onchainLevelUpgrade: 'TreeLevelUpgrade',
  onchainClaimPoints: 'ClaimTreePoints',
};

const COLLECTION_ACTION_MAP: Record<string, string> = {
  collections: 'fetchCollections',
  searchCollections: 'fetchSearchCollections',
  recommendedCollections: 'fetchRecommendedCollections',
  collectionInfo: 'fetchNFTCollectionInfo',
  compositeNftInfos: 'fetchCompositeNftInfos',
  traits: 'fetchCollectionAllTraitsInfos',
  generation: 'fetchCollectionGenerationInfos',
  rarity: 'fetchCollectionRarityInfos',
  activities: 'fetchCollectionActivities',
  trending: 'fetchTrendingCollections',
  hot: 'fetchHotNFTs',
};

const WATCH_SIGNAL_ACTION_MAP: Record<string, string> = {
  subscribe: 'registerHandler',
  unsubscribe: 'unRegisterHandler',
  pullSnapshot: 'snapshot',
};

const QUOTE_INCLUDE_ACTIONS: Record<string, string> = {
  tokenData: 'fetchGetTokenData',
  nftMarketData: 'fetchGetNftPrices',
  saleInfo: 'fetchNftSalesInfo',
  txFee: 'fetchTransactionFee',
};

function normalizeChain(chain?: string): string {
  if (chain && CHAIN_SET.has(chain)) return chain;
  return 'AELF';
}

function extractErrorMessage(err: any): string {
  if (typeof err === 'string') return err;
  if (!err) return 'Unknown error';
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    (typeof err === 'object' ? JSON.stringify(err) : String(err)) ||
    'Unknown error'
  );
}

function mapError(err: any): ErrorMapping {
  const message = extractErrorMessage(err);

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return { code: 'UNAUTHORIZED', message, retryable: false };
    }
    if (status === 429) {
      return { code: 'RATE_LIMITED', message, retryable: true };
    }
    if (status && status >= 500) {
      return { code: 'UPSTREAM_ERROR', message, retryable: true };
    }
    return { code: 'UPSTREAM_ERROR', message, retryable: false };
  }

  if (/maintenance|disabled|offline/i.test(message)) {
    return { code: 'MAINTENANCE', message, maintenance: true, retryable: true };
  }
  if (/timeout|timed out/i.test(message)) {
    return { code: 'TX_TIMEOUT', message, retryable: true };
  }
  if (/revert|no permission|transaction failed|failed with status/i.test(message)) {
    return { code: 'ONCHAIN_REVERT', message, retryable: false };
  }

  return { code: 'INTERNAL_ERROR', message, retryable: false };
}

function getContractMode(skillName: string, method: string): ContractExecutionMode {
  const views = CONTRACT_VIEW_METHODS[skillName];
  if (views?.has(method)) return 'view';
  if (method.startsWith('Get')) return 'view';
  return 'send';
}

function pickContractAddress(
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

function resolveContractAddress(
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

function parseApiRouteFromEnv(skillName: string, action: string): ApiRoute | null {
  const rawMap =
    process.env.EFOREST_FOREST_API_ACTION_MAP_JSON ||
    process.env.FOREST_API_ACTION_MAP_JSON;
  if (!rawMap) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(rawMap);
  } catch {
    return null;
  }

  const tuple = parsed?.[`${skillName}:${action}`];
  const nested = parsed?.[skillName]?.[action];
  const route = tuple || nested;
  if (!route) return null;

  if (typeof route === 'string') {
    return { method: 'GET', path: route, auth: true };
  }

  const method = String(route.method || 'GET').toUpperCase();
  const path = route.path || route.url;
  if (!path) return null;

  return {
    method: method as ApiRoute['method'],
    path,
    auth: route.auth !== false,
  };
}

function getTransactionId(data: any): string {
  return (
    data?.transactionId ||
    data?.result?.TransactionId ||
    data?.result?.transactionId ||
    data?.TransactionId ||
    ''
  );
}

async function defaultContractInvoker(
  req: ContractInvokeRequest,
): Promise<any> {
  if (req.mode === 'view') {
    return await callContractView(
      req.rpcUrl,
      req.contractAddress,
      req.method,
      req.args,
    );
  }

  return await callContractSend(
    req.rpcUrl,
    req.contractAddress,
    req.method,
    req.args,
    req.config.signer,
  );
}

async function defaultApiInvoker(req: ApiInvokeRequest): Promise<any> {
  const token = req.route.auth === false ? '' : await fetchAuthToken(req.config.connectUrl, req.config.wallet);
  const client = createApiClient(req.config.apiUrl, token || undefined);

  switch (req.route.method) {
    case 'POST': {
      const resp = await client.post(req.route.path, req.params || {});
      return resp.data?.data ?? resp.data;
    }
    case 'PUT': {
      const resp = await client.put(req.route.path, req.params || {});
      return resp.data?.data ?? resp.data;
    }
    case 'DELETE': {
      const resp = await client.delete(req.route.path, { data: req.params || {} });
      return resp.data?.data ?? resp.data;
    }
    default: {
      const resp = await client.get(req.route.path, { params: req.params || {} });
      return resp.data?.data ?? resp.data;
    }
  }
}

async function executeContractMethodSkill(
  skillName: string,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
): Promise<ForestEnvelope> {
  const method = String(input.method || '');
  const args = (input.args || {}) as Record<string, any>;
  const chain = normalizeChain(input.chain);
  const mode = getContractMode(skillName, method);

  const contractAddress = resolveContractAddress(
    skillName,
    chain,
    ctx.config.contracts || {},
  );
  if (!contractAddress) {
    return failureEnvelope(
      'MAINTENANCE',
      `Contract address is not configured for ${skillName} on chain ${chain}.`,
      {
        maintenance: true,
        traceId,
        details: { skillName, chain },
      },
    );
  }

  const rpcUrl = ctx.config.rpcUrls?.[chain];
  if (!rpcUrl) {
    return failureEnvelope(
      'MAINTENANCE',
      `RPC URL is not configured for chain ${chain}.`,
      {
        maintenance: true,
        traceId,
        details: { chain },
      },
    );
  }

  if (input.dryRun) {
    return successEnvelope(
      {
        dryRun: true,
        executionMode: mode,
        chain,
        contractAddress,
        method,
        args,
        steps: [
          {
            action: `${mode === 'send' ? 'Send' : 'View'} contract method`,
            contract: contractAddress,
            method,
            params: args,
          },
        ],
      },
      traceId,
    );
  }

  const invoker = ctx.contractInvoker || defaultContractInvoker;
  const result = await invoker({
    skillName,
    method,
    args,
    chain,
    contractAddress,
    rpcUrl,
    mode,
    config: ctx.config,
  });

  const data: Record<string, any> = {
    executionMode: mode,
    chain,
    contractAddress,
    method,
    args,
    result,
  };

  if (mode === 'send') {
    const txId = getTransactionId(result);
    if (txId) {
      data.transactionId = txId;
    }
  }

  return successEnvelope(data, traceId);
}

async function executeApiMethodSkill(
  skillName: string,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
): Promise<ForestEnvelope> {
  const action = String(input.action || '');
  const params = (input.params || {}) as Record<string, any>;

  if (input.dryRun) {
    return successEnvelope(
      {
        dryRun: true,
        action,
        params,
        steps: [
          {
            action: 'Invoke backend API action',
            apiAction: action,
            params,
          },
        ],
      },
      traceId,
    );
  }

  const route = parseApiRouteFromEnv(skillName, action);
  if (!route) {
    return failureEnvelope(
      'MAINTENANCE',
      `No API route configured for ${skillName}.${action}. Configure EFOREST_FOREST_API_ACTION_MAP_JSON.`,
      {
        maintenance: true,
        traceId,
        details: { skillName, action },
      },
    );
  }

  const invoker = ctx.apiInvoker || defaultApiInvoker;
  const result = await invoker({
    skillName,
    action,
    params,
    route,
    config: ctx.config,
  });

  return successEnvelope(
    {
      action,
      route,
      params,
      result,
    },
    traceId,
  );
}

async function invokeContractFromWorkflow(
  skillName: string,
  method: string,
  args: Record<string, any>,
  chain: string | undefined,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
): Promise<ForestEnvelope> {
  return await dispatchForestSkill(
    skillName,
    {
      env: input.env,
      dryRun: input.dryRun,
      traceId,
      timeoutMs: input.timeoutMs,
      method,
      args,
      chain,
    },
    ctx,
  );
}

async function invokeApiFromWorkflow(
  skillName: string,
  action: string,
  params: Record<string, any>,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
): Promise<ForestEnvelope> {
  return await dispatchForestSkill(
    skillName,
    {
      env: input.env,
      dryRun: input.dryRun,
      traceId,
      timeoutMs: input.timeoutMs,
      action,
      params,
    },
    ctx,
  );
}

async function executeWorkflowSkill(
  skillName: string,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
): Promise<ForestEnvelope> {
  const warnings: string[] = [];

  switch (skillName) {
    case 'aelf-forest-create-collection': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-multitoken',
        'Create',
        payload,
        payload.issueChainId,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(
        {
          transactionId: getTransactionId(result.data),
          symbol: payload.symbol,
          crossChainSynced: payload.issueChainId === 'AELF' || input.dryRun,
        },
        traceId,
        warnings,
      );
    }

    case 'aelf-forest-create-item': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-multitoken',
        'Create',
        payload,
        payload.issueChainId,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;

      const transactionId = getTransactionId(result.data);
      let crossChainSynced = payload.issueChainId === 'AELF' || !!input.dryRun;

      if (!input.dryRun && payload.issueChainId && payload.issueChainId !== 'AELF') {
        const syncResult = await invokeApiFromWorkflow(
          'aelf-forest-api-sync',
          'fetchSyncCollection',
          {
            fromChainId: 'AELF',
            toChainId: payload.issueChainId,
            symbol: payload.symbol,
            txHash: transactionId,
          },
          input,
          ctx,
          traceId,
        );
        if (isFailureEnvelope(syncResult)) {
          warnings.push(
            `Cross-chain sync degraded: ${syncResult.message}`,
          );
        } else {
          crossChainSynced = true;
        }
      }

      return successEnvelope(
        {
          transactionId,
          symbol: payload.symbol,
          issued: true,
          crossChainSynced,
        },
        traceId,
        warnings,
      );
    }

    case 'aelf-forest-batch-create-items': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-proxy',
        'BatchCreateNFT',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(
        {
          transactionId: getTransactionId(result.data),
          count: Array.isArray(payload.items) ? payload.items.length : 0,
        },
        traceId,
      );
    }

    case 'aelf-forest-list-item': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-market',
        'ListWithFixedPrice',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-buy-now': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-market',
        'BatchBuyNow',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(
        {
          transactionId: getTransactionId(result.data),
          partialFailed: false,
        },
        traceId,
      );
    }

    case 'aelf-forest-make-offer': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-market',
        'MakeOffer',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-deal-offer': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-market',
        'Deal',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-cancel-offer': {
      const payload = input.payload || {};
      const method = payload.mode === 'batch' ? 'BatchCancelOfferList' : 'CancelOfferListByExpireTime';
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-market',
        method,
        payload.params || payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-cancel-listing': {
      const payload = input.payload || {};
      const method =
        payload.mode === 'batch' || payload.mode === 'batchDelist'
          ? 'BatchDeList'
          : payload.mode === 'batchCancelList'
            ? 'BatchCancelList'
            : 'Delist';
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-market',
        method,
        payload.params || payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-transfer-item': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-multitoken',
        'Transfer',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-get-price-quote': {
      const payload = input.payload || {};
      const include: string[] = Array.isArray(payload.include)
        ? payload.include
        : ['tokenData', 'nftMarketData', 'saleInfo', 'txFee'];

      const data: Record<string, any> = {};
      for (const item of include) {
        const action = QUOTE_INCLUDE_ACTIONS[item];
        if (!action) continue;

        const result = await invokeApiFromWorkflow(
          'aelf-forest-api-market',
          action,
          {
            symbol: payload.symbol,
            nftId: payload.nftId,
            chain: payload.chain,
          },
          input,
          ctx,
          traceId,
        );

        if (isFailureEnvelope(result)) {
          warnings.push(`${item} degraded: ${result.message}`);
          continue;
        }
        data[item === 'nftMarketData' ? 'marketPrice' : item] = result.data.result;
      }

      if (data.tokenData && data.tokenPrice === undefined) {
        data.tokenPrice = data.tokenData;
        delete data.tokenData;
      }
      return successEnvelope(data, traceId, warnings);
    }

    case 'aelf-forest-issue-item': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-multitoken',
        'Issue',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(
        {
          transactionId: getTransactionId(result.data),
          proxyIssuer: payload.issuer || '',
        },
        traceId,
      );
    }

    case 'aelf-forest-place-bid': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-auction',
        'PlaceBid',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-claim-drop': {
      const payload = input.payload || {};
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-drop',
        'ClaimDrop',
        payload,
        payload.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(
        {
          transactionId: getTransactionId(result.data),
          claimDetailList: [],
        },
        traceId,
      );
    }

    case 'aelf-forest-query-drop': {
      const action = DROP_ACTION_MAP[input.action as string];
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-drop',
        action,
        (input.params || {}) as Record<string, any>,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-whitelist-read': {
      const method = WHITELIST_READ_METHOD_MAP[input.action as string];
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-whitelist',
        method,
        (input.params || {}) as Record<string, any>,
        (input.params as any)?.chain || input.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-whitelist-manage': {
      const method = WHITELIST_MANAGE_METHOD_MAP[input.action as string];
      const result = await invokeContractFromWorkflow(
        'aelf-forest-contract-whitelist',
        method,
        (input.params || {}) as Record<string, any>,
        (input.params as any)?.chain || input.chain,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
    }

    case 'aelf-forest-ai-generate': {
      const payload = (input.payload || {}) as Record<string, any>;
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-ai',
        'fetchGenerate',
        payload,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(
        {
          transactionId: result.data.result?.transactionId || '',
          items: result.data.result?.items || result.data.result || [],
        },
        traceId,
      );
    }

    case 'aelf-forest-ai-retry': {
      const action = AI_RETRY_ACTION_MAP[input.action as string];
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-ai',
        action,
        (input.params || {}) as Record<string, any>,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-create-platform-nft': {
      const action = PLATFORM_ACTION_MAP[input.action as string];
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-platform',
        action,
        (input.params || {}) as Record<string, any>,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-miniapp-action': {
      const action = String(input.action || '');
      if (MINIAPP_ONCHAIN_METHOD_MAP[action]) {
        const result = await invokeContractFromWorkflow(
          'aelf-forest-contract-miniapp',
          MINIAPP_ONCHAIN_METHOD_MAP[action],
          (input.params || {}) as Record<string, any>,
          (input.params as any)?.chain || input.chain,
          input,
          ctx,
          traceId,
        );
        if (isFailureEnvelope(result)) return result;
        return successEnvelope({ transactionId: getTransactionId(result.data) }, traceId);
      }

      const apiAction = MINIAPP_API_ACTION_MAP[action];
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-miniapp',
        apiAction,
        (input.params || {}) as Record<string, any>,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-update-profile': {
      const payload = (input.payload || {}) as Record<string, any>;
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-user',
        'saveUserSettings',
        payload,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-query-collections': {
      const action = COLLECTION_ACTION_MAP[input.action as string];
      const apiSkill = action === 'fetchHotNFTs' ? 'aelf-forest-api-nft' : 'aelf-forest-api-collection';
      const result = await invokeApiFromWorkflow(
        apiSkill,
        action,
        (input.params || {}) as Record<string, any>,
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope(result.data.result || {}, traceId);
    }

    case 'aelf-forest-watch-market-signals': {
      const action = WATCH_SIGNAL_ACTION_MAP[input.action as string];
      const result = await invokeApiFromWorkflow(
        'aelf-forest-api-realtime',
        action,
        {
          ...(input.params || {}),
          channels: input.channels,
          address: input.address,
        },
        input,
        ctx,
        traceId,
      );
      if (isFailureEnvelope(result)) return result;
      return successEnvelope({ events: result.data.result || [] }, traceId);
    }

    default:
      return failureEnvelope(
        'MAINTENANCE',
        `Workflow handler is not available for ${skillName}.`,
        {
          maintenance: true,
          traceId,
          details: { skillName },
        },
      );
  }
}

export async function dispatchForestSkill(
  skillName: string,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
): Promise<ForestEnvelope> {
  const skill = getForestSkill(skillName);
  if (!skill) {
    return failureEnvelope('INVALID_PARAMS', `Unknown forest skill: ${skillName}`);
  }

  const normalizedInput = ensureInputEnvelope(input || {});
  const traceId = buildTraceId(normalizedInput.traceId, skillName);

  const validation = validateForestSchema(skill.in, normalizedInput);
  if (!validation.valid) {
    return failureEnvelope('INVALID_PARAMS', 'Input does not match schema.', {
      traceId,
      details: {
        schema: skill.in,
        errors: validation.errors,
      },
    });
  }

  const serviceState = Config.getServiceState(skill.serviceKey);
  if (!serviceState.enabled) {
    return failureEnvelope(
      'SERVICE_DISABLED',
      `Service disabled for key ${skill.serviceKey}.`,
      {
        maintenance: true,
        traceId,
        details: { serviceKey: skill.serviceKey },
      },
    );
  }
  if (serviceState.maintenance) {
    return failureEnvelope(
      'MAINTENANCE',
      `Service in maintenance for key ${skill.serviceKey}.`,
      {
        maintenance: true,
        traceId,
        details: { serviceKey: skill.serviceKey },
      },
    );
  }

  try {
    if (skill.kind === 'method.contract') {
      return await executeContractMethodSkill(
        skillName,
        normalizedInput,
        ctx,
        traceId,
      );
    }
    if (skill.kind === 'method.api') {
      return await executeApiMethodSkill(skillName, normalizedInput, ctx, traceId);
    }
    return await executeWorkflowSkill(skillName, normalizedInput, ctx, traceId);
  } catch (err) {
    const mapped = mapError(err);
    return failureEnvelope(mapped.code, mapped.message, {
      traceId,
      maintenance: mapped.maintenance,
      retryable: mapped.retryable,
      details: mapped.details,
    });
  }
}
