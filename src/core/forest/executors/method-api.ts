import {
  failureEnvelope,
  successEnvelope,
  type ForestEnvelope,
  type ForestInputEnvelope,
} from '../../../../lib/forest-envelope';
import { defaultApiInvoker } from '../invokers';
import { parseApiRouteFromEnv } from '../route-mapping';
import type { ForestDispatchContext } from '../types';

export async function executeApiMethodSkill(
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
