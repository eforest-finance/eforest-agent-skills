import {
  isFailureEnvelope,
  successEnvelope,
} from '../../../../lib/forest-envelope';
import {
  AI_RETRY_ACTION_MAP,
  COLLECTION_ACTION_MAP,
  MINIAPP_API_ACTION_MAP,
  MINIAPP_ONCHAIN_METHOD_MAP,
  PLATFORM_ACTION_MAP,
  WATCH_SIGNAL_ACTION_MAP,
} from '../constants';
import type { WorkflowHandler } from '../types';

const aiGenerateHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = (input.payload || {}) as Record<string, any>;
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-ai',
    'fetchGenerate',
    payload,
    input,
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
};

const aiRetryHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const action = AI_RETRY_ACTION_MAP[input.action as string];
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-ai',
    action,
    (input.params || {}) as Record<string, any>,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const platformNftHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const action = PLATFORM_ACTION_MAP[input.action as string];
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-platform',
    action,
    (input.params || {}) as Record<string, any>,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const miniappActionHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const action = String(input.action || '');
  if (MINIAPP_ONCHAIN_METHOD_MAP[action]) {
    const result = await helpers.invokeContractFromWorkflow(
      'aelf-forest-contract-miniapp',
      MINIAPP_ONCHAIN_METHOD_MAP[action],
      (input.params || {}) as Record<string, any>,
      (input.params as any)?.chain || input.chain,
      input,
      traceId,
    );
    if (isFailureEnvelope(result)) return result;

    return successEnvelope(
      { transactionId: helpers.getTransactionId(result.data) },
      traceId,
    );
  }

  const apiAction = MINIAPP_API_ACTION_MAP[action];
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-miniapp',
    apiAction,
    (input.params || {}) as Record<string, any>,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const updateProfileHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const payload = (input.payload || {}) as Record<string, any>;
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-user',
    'saveUserSettings',
    payload,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const queryCollectionsHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const action = COLLECTION_ACTION_MAP[input.action as string];
  const apiSkill =
    action === 'fetchHotNFTs'
      ? 'aelf-forest-api-nft'
      : 'aelf-forest-api-collection';

  const result = await helpers.invokeApiFromWorkflow(
    apiSkill,
    action,
    (input.params || {}) as Record<string, any>,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const watchSignalsHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const action = WATCH_SIGNAL_ACTION_MAP[input.action as string];
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-realtime',
    action,
    {
      ...(input.params || {}),
      channels: input.channels,
      address: input.address,
    },
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope({ events: result.data.result || [] }, traceId);
};

export const P2_WORKFLOW_HANDLERS: Record<string, WorkflowHandler> = {
  'aelf-forest-ai-generate': aiGenerateHandler,
  'aelf-forest-ai-retry': aiRetryHandler,
  'aelf-forest-create-platform-nft': platformNftHandler,
  'aelf-forest-miniapp-action': miniappActionHandler,
  'aelf-forest-update-profile': updateProfileHandler,
  'aelf-forest-query-collections': queryCollectionsHandler,
  'aelf-forest-watch-market-signals': watchSignalsHandler,
};
