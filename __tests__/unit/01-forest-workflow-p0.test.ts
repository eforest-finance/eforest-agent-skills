import { describe, expect, test } from 'bun:test';

import type { ForestEnvelope, ForestInputEnvelope } from '../../lib/forest-envelope';
import { P0_WORKFLOW_HANDLERS } from '../../src/core/forest/workflow/p0';

type ContractCall = {
  skillName: string;
  method: string;
  args: Record<string, any>;
  chain: string | undefined;
  input: ForestInputEnvelope;
  traceId: string;
};

type ApiCall = {
  skillName: string;
  action: string;
  params: Record<string, any>;
  input: ForestInputEnvelope;
  traceId: string;
};

function success(data: Record<string, any>): ForestEnvelope {
  return {
    success: true,
    code: 'OK',
    data,
    warnings: [],
  };
}

function failure(code = 'UPSTREAM_ERROR', message = 'mock failure'): ForestEnvelope {
  return {
    success: false,
    code: code as any,
    message,
  };
}

function createHelpers(overrides?: {
  contractResult?: ForestEnvelope;
  apiResult?: ForestEnvelope;
}) {
  const contractCalls: ContractCall[] = [];
  const apiCalls: ApiCall[] = [];

  return {
    contractCalls,
    apiCalls,
    helpers: {
      invokeContractFromWorkflow: async (
        skillName: string,
        method: string,
        args: Record<string, any>,
        chain: string | undefined,
        input: ForestInputEnvelope,
        traceId: string,
      ) => {
        contractCalls.push({ skillName, method, args, chain, input, traceId });
        if (overrides?.contractResult) return overrides.contractResult;
        return success({ TransactionId: `tx-${method.toLowerCase()}` });
      },
      invokeApiFromWorkflow: async (
        skillName: string,
        action: string,
        params: Record<string, any>,
        input: ForestInputEnvelope,
        traceId: string,
      ) => {
        apiCalls.push({ skillName, action, params, input, traceId });
        if (overrides?.apiResult) return overrides.apiResult;
        return success({ result: { action, ok: true } });
      },
      getTransactionId: (data: any) =>
        data?.TransactionId || data?.transactionId || data?.txId || 'tx-fallback',
    },
  };
}

const traceId = 'trace-p0-tests';

describe('forest workflow P0 coverage', () => {
  test('create collection and item handlers include tx/sync semantics', async () => {
    const createCollection = P0_WORKFLOW_HANDLERS['aelf-forest-create-collection'];
    const createItem = P0_WORKFLOW_HANDLERS['aelf-forest-create-item'];
    if (!createCollection || !createItem) {
      throw new Error('P0 handlers are not available');
    }

    const helpersA = createHelpers();
    const collectionResult = await createCollection(
      {
        dryRun: false,
        payload: { symbol: 'COL-1', issueChainId: 'AELF' },
      },
      {} as any,
      traceId,
      helpersA.helpers as any,
    );

    expect(collectionResult.success).toBe(true);
    if (collectionResult.success) {
      expect(collectionResult.data.transactionId).toBe('tx-create');
      expect(collectionResult.data.crossChainSynced).toBe(true);
    }

    const helpersB = createHelpers();
    const itemSynced = await createItem(
      {
        payload: { symbol: 'NFT-1', issueChainId: 'tDVV' },
      },
      {} as any,
      traceId,
      helpersB.helpers as any,
    );
    expect(helpersB.apiCalls.length).toBe(1);
    expect(itemSynced.success).toBe(true);
    if (itemSynced.success) {
      expect(itemSynced.data.crossChainSynced).toBe(true);
      expect(itemSynced.data.issued).toBe(true);
      expect(itemSynced.warnings).toEqual([]);
    }

    const helpersC = createHelpers({
      apiResult: failure('TX_TIMEOUT', 'sync timed out'),
    });
    const itemDegraded = await createItem(
      {
        payload: { symbol: 'NFT-2', issueChainId: 'tDVW' },
      },
      {} as any,
      traceId,
      helpersC.helpers as any,
    );
    expect(itemDegraded.success).toBe(true);
    if (itemDegraded.success) {
      expect(itemDegraded.data.crossChainSynced).toBe(false);
      expect(itemDegraded.warnings.some((x) => x.includes('Cross-chain sync degraded'))).toBe(
        true,
      );
    }
  });

  test('market/create handlers use expected contract methods', async () => {
    const handlers: Array<{
      skill: string;
      payload: Record<string, any>;
      expectedMethod: string;
    }> = [
      {
        skill: 'aelf-forest-batch-create-items',
        payload: { chain: 'AELF', items: [{ id: '1' }, { id: '2' }] },
        expectedMethod: 'BatchCreateNFT',
      },
      {
        skill: 'aelf-forest-list-item',
        payload: { chain: 'AELF', symbol: 'NFT-1' },
        expectedMethod: 'ListWithFixedPrice',
      },
      {
        skill: 'aelf-forest-buy-now',
        payload: { chain: 'AELF', itemIds: ['id-1'] },
        expectedMethod: 'BatchBuyNow',
      },
      {
        skill: 'aelf-forest-make-offer',
        payload: { chain: 'AELF', symbol: 'NFT-1' },
        expectedMethod: 'MakeOffer',
      },
      {
        skill: 'aelf-forest-deal-offer',
        payload: { chain: 'AELF', symbol: 'NFT-1' },
        expectedMethod: 'Deal',
      },
      {
        skill: 'aelf-forest-transfer-item',
        payload: { chain: 'AELF', to: 'ELF_TO', symbol: 'NFT-1', amount: 1 },
        expectedMethod: 'Transfer',
      },
    ];

    for (const item of handlers) {
      const handler = P0_WORKFLOW_HANDLERS[item.skill];
      if (!handler) throw new Error(`Missing handler: ${item.skill}`);
      const helpers = createHelpers();

      const result = await handler(
        { payload: item.payload },
        {} as any,
        traceId,
        helpers.helpers as any,
      );

      expect(result.success).toBe(true);
      expect(helpers.contractCalls[0]?.method).toBe(item.expectedMethod);

      if (item.skill === 'aelf-forest-batch-create-items' && result.success) {
        expect(result.data.count).toBe(2);
      }
      if (item.skill === 'aelf-forest-buy-now' && result.success) {
        expect(result.data.partialFailed).toBe(false);
      }
    }
  });

  test('cancel handlers choose methods by mode', async () => {
    const cancelOffer = P0_WORKFLOW_HANDLERS['aelf-forest-cancel-offer'];
    const cancelListing = P0_WORKFLOW_HANDLERS['aelf-forest-cancel-listing'];
    if (!cancelOffer || !cancelListing) throw new Error('cancel handlers missing');

    const offerBatch = createHelpers();
    await cancelOffer(
      { payload: { chain: 'AELF', mode: 'batch', params: { ids: ['1'] } } },
      {} as any,
      traceId,
      offerBatch.helpers as any,
    );
    expect(offerBatch.contractCalls[0]?.method).toBe('BatchCancelOfferList');

    const offerSingle = createHelpers();
    await cancelOffer(
      { payload: { chain: 'AELF', mode: 'single', params: { id: '1' } } },
      {} as any,
      traceId,
      offerSingle.helpers as any,
    );
    expect(offerSingle.contractCalls[0]?.method).toBe('CancelOfferListByExpireTime');

    const delistBatch = createHelpers();
    await cancelListing(
      { payload: { chain: 'AELF', mode: 'batchDelist', params: { ids: ['1'] } } },
      {} as any,
      traceId,
      delistBatch.helpers as any,
    );
    expect(delistBatch.contractCalls[0]?.method).toBe('BatchDeList');

    const cancelBatch = createHelpers();
    await cancelListing(
      { payload: { chain: 'AELF', mode: 'batchCancelList', params: { ids: ['1'] } } },
      {} as any,
      traceId,
      cancelBatch.helpers as any,
    );
    expect(cancelBatch.contractCalls[0]?.method).toBe('BatchCancelList');

    const delistSingle = createHelpers();
    await cancelListing(
      { payload: { chain: 'AELF', mode: 'single', params: { id: '1' } } },
      {} as any,
      traceId,
      delistSingle.helpers as any,
    );
    expect(delistSingle.contractCalls[0]?.method).toBe('Delist');
  });

  test('quote handler aggregates included actions and degrades partial errors', async () => {
    const quote = P0_WORKFLOW_HANDLERS['aelf-forest-get-price-quote'];
    if (!quote) throw new Error('quote handler missing');

    const apiCalls: string[] = [];
    const helpers = {
      invokeContractFromWorkflow: async () => success({}),
      invokeApiFromWorkflow: async (_skill: string, action: string) => {
        apiCalls.push(action);
        if (action === 'fetchGetTokenData') return success({ result: { usd: 1.23 } });
        if (action === 'fetchGetNftPrices') return success({ result: { floor: 99 } });
        if (action === 'fetchNftSalesInfo') return failure('UPSTREAM_ERROR', 'sales down');
        if (action === 'fetchTransactionFee') return success({ result: { fee: '0.01 ELF' } });
        return success({ result: { ok: true } });
      },
      getTransactionId: () => 'tx',
    };

    const result = await quote(
      {
        payload: {
          symbol: 'NFT-1',
          nftId: '1',
          chain: 'AELF',
          include: ['tokenData', 'nftMarketData', 'saleInfo', 'txFee', 'unknownField'],
        },
      },
      {} as any,
      traceId,
      helpers as any,
    );

    expect(apiCalls).toEqual([
      'fetchGetTokenData',
      'fetchGetNftPrices',
      'fetchNftSalesInfo',
      'fetchTransactionFee',
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokenPrice).toEqual({ usd: 1.23 });
      expect(result.data.tokenData).toBeUndefined();
      expect(result.data.marketPrice).toEqual({ floor: 99 });
      expect(result.data.txFee).toEqual({ fee: '0.01 ELF' });
      expect(result.warnings.some((x) => x.includes('saleInfo degraded'))).toBe(true);
    }
  });

  test('handlers pass through upstream contract failures', async () => {
    const listItem = P0_WORKFLOW_HANDLERS['aelf-forest-list-item'];
    if (!listItem) throw new Error('list handler missing');

    const failResult = failure('ONCHAIN_REVERT', 'execution reverted');
    const helpers = createHelpers({ contractResult: failResult });

    const result = await listItem(
      { payload: { chain: 'AELF', symbol: 'NFT-1' } },
      {} as any,
      traceId,
      helpers.helpers as any,
    );

    expect(result).toEqual(failResult);
  });
});
