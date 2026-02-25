import {
  isFailureEnvelope,
  successEnvelope,
} from '../../../../lib/forest-envelope';
import {
  DROP_ACTION_MAP,
  WHITELIST_MANAGE_METHOD_MAP,
  WHITELIST_READ_METHOD_MAP,
} from '../constants';
import type { WorkflowHandler } from '../types';

const issueItemHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-multitoken',
    'Issue',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(
    {
      transactionId: helpers.getTransactionId(result.data),
      proxyIssuer: payload.issuer || '',
    },
    traceId,
  );
};

const placeBidHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-auction',
    'PlaceBid',
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

const claimDropHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const payload = input.payload || {};
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-drop',
    'ClaimDrop',
    payload,
    payload.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(
    {
      transactionId: helpers.getTransactionId(result.data),
      claimDetailList: [],
    },
    traceId,
  );
};

const queryDropHandler: WorkflowHandler = async (input, _ctx, traceId, helpers) => {
  const action = DROP_ACTION_MAP[input.action as string];
  const result = await helpers.invokeApiFromWorkflow(
    'aelf-forest-api-drop',
    action,
    (input.params || {}) as Record<string, any>,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const whitelistReadHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const method = WHITELIST_READ_METHOD_MAP[input.action as string];
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-whitelist',
    method,
    (input.params || {}) as Record<string, any>,
    (input.params as any)?.chain || input.chain,
    input,
    traceId,
  );
  if (isFailureEnvelope(result)) return result;

  return successEnvelope(result.data.result || {}, traceId);
};

const whitelistManageHandler: WorkflowHandler = async (
  input,
  _ctx,
  traceId,
  helpers,
) => {
  const method = WHITELIST_MANAGE_METHOD_MAP[input.action as string];
  const result = await helpers.invokeContractFromWorkflow(
    'aelf-forest-contract-whitelist',
    method,
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
};

export const P1_WORKFLOW_HANDLERS: Record<string, WorkflowHandler> = {
  'aelf-forest-issue-item': issueItemHandler,
  'aelf-forest-place-bid': placeBidHandler,
  'aelf-forest-claim-drop': claimDropHandler,
  'aelf-forest-query-drop': queryDropHandler,
  'aelf-forest-whitelist-read': whitelistReadHandler,
  'aelf-forest-whitelist-manage': whitelistManageHandler,
};
