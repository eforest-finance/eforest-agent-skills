import {
  isFailureEnvelope,
  successEnvelope,
} from '../../../../lib/forest-envelope';
import { QUOTE_INCLUDE_ACTIONS } from '../constants';
import type { WorkflowHandler } from '../types';

const createCollectionHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const warnings: string[] = [];
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-multitoken',
    'Create',
    payload,
    payload.issueChainId,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(
    {
      transactionId: helpers.getTransactionId(result.data),
      symbol: payload.symbol,
      crossChainSynced: payload.issueChainId === 'AELF' || input.dryRun,
    },
    traceId,
    warnings,
  );
};

const createItemHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const warnings: string[] = [];
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-multitoken',
    'Create',
    payload,
    payload.issueChainId,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  const transactionId = helpers.getTransactionId(result.data);
  let crossChainSynced = payload.issueChainId === 'AELF' || !!input.dryRun;

  if (!input.dryRun && payload.issueChainId && payload.issueChainId !== 'AELF') {
    const syncResult = await helpers.invokeApiFromWorkflow(
      'aelf-forest-api-sync',
      'fetchSyncCollection',
      {
        fromChainId: 'AELF',
        toChainId: payload.issueChainId,
        symbol: payload.symbol,
        txHash: transactionId,
      },
      input,
      traceId,
    );
    if (isFailureEnvelope(syncResult)) {
      warnings.push(`Cross-chain sync degraded: ${syncResult.message}`);
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
};

const batchCreateItemsHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-proxy',
    'BatchCreateNFT',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(
    {
      transactionId: helpers.getTransactionId(result.data),
      count: Array.isArray(payload.items) ? payload.items.length : 0,
    },
    traceId,
  );
};

const listItemHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-market',
    'ListWithFixedPrice',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    { transactionId: helpers.getTransactionId(result.data) },
    traceId,
  );
};

const buyNowHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-market',
    'BatchBuyNow',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    {
      transactionId: helpers.getTransactionId(result.data),
      partialFailed: false,
    },
    traceId,
  );
};

const makeOfferHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-market',
    'MakeOffer',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    { transactionId: helpers.getTransactionId(result.data) },
    traceId,
  );
};

const dealOfferHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-market',
    'Deal',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    { transactionId: helpers.getTransactionId(result.data) },
    traceId,
  );
};

const cancelOfferHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const method =
    payload.mode === 'batch'
      ? 'BatchCancelOfferList'
      : 'CancelOfferListByExpireTime';

  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-market',
    method,
    payload.params || payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    { transactionId: helpers.getTransactionId(result.data) },
    traceId,
  );
};

const cancelListingHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const payload = input.payload || {};
  const method =
    payload.mode === 'batch' || payload.mode === 'batchDelist'
      ? 'BatchDeList'
      : payload.mode === 'batchCancelList'
        ? 'BatchCancelList'
        : 'Delist';

  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-market',
    method,
    payload.params || payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    { transactionId: helpers.getTransactionId(result.data) },
    traceId,
  );
};

const transferItemHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-multitoken',
    'Transfer',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;
  return successEnvelope(
    { transactionId: helpers.getTransactionId(result.data) },
    traceId,
  );
};

const getPriceQuoteHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const warnings: string[] = [];
  const payload = input.payload || {};
  const include: string[] = Array.isArray(payload.include)
    ? payload.include
    : ['tokenData', 'nftMarketData', 'saleInfo', 'txFee'];

  const data: Record<string, any> = {};
  for (const item of include) {
    const action = QUOTE_INCLUDE_ACTIONS[item];
    if (!action) continue;

    const result = await helpers.invokeApiFromWorkflow(
      'aelf-forest-api-market',
      action,
      {
        symbol: payload.symbol,
        nftId: payload.nftId,
        chain: payload.chain,
      },
      input,
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
};

export const P0_WORKFLOW_HANDLERS: Record<string, WorkflowHandler> = {
  'aelf-forest-create-collection': createCollectionHandler,
  'aelf-forest-create-item': createItemHandler,
  'aelf-forest-batch-create-items': batchCreateItemsHandler,
  'aelf-forest-list-item': listItemHandler,
  'aelf-forest-buy-now': buyNowHandler,
  'aelf-forest-make-offer': makeOfferHandler,
  'aelf-forest-deal-offer': dealOfferHandler,
  'aelf-forest-cancel-offer': cancelOfferHandler,
  'aelf-forest-cancel-listing': cancelListingHandler,
  'aelf-forest-transfer-item': transferItemHandler,
  'aelf-forest-get-price-quote': getPriceQuoteHandler,
};
