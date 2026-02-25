import {
  failureEnvelope,
  type ForestEnvelope,
  type ForestInputEnvelope,
} from '../../../../lib/forest-envelope';
import { P0_WORKFLOW_HANDLERS } from './p0';
import { P1_WORKFLOW_HANDLERS } from './p1';
import { P2_WORKFLOW_HANDLERS } from './p2';
import type {
  ForestDispatchContext,
  WorkflowHandler,
  WorkflowInvokeHelpers,
} from '../types';

const WORKFLOW_HANDLERS: Record<string, WorkflowHandler> = {
  ...P0_WORKFLOW_HANDLERS,
  ...P1_WORKFLOW_HANDLERS,
  ...P2_WORKFLOW_HANDLERS,
};

export async function executeWorkflowSkill(
  skillName: string,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
  helpers: WorkflowInvokeHelpers,
): Promise<ForestEnvelope> {
  const handler = WORKFLOW_HANDLERS[skillName];

  if (!handler) {
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

  return await handler(input, ctx, traceId, helpers);
}

export function listWorkflowHandlers(): string[] {
  return Object.keys(WORKFLOW_HANDLERS);
}
