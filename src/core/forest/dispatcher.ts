import {
  buildTraceId,
  ensureInputEnvelope,
  failureEnvelope,
  type ForestEnvelope,
  type ForestInputEnvelope,
} from '../../../lib/forest-envelope';
import { Config } from '../../../lib/forest-service';
import { getForestSkill } from '../../../lib/forest-skill-registry';
import { validateForestSchema } from '../../../lib/forest-validator';
import { mapError } from './error-mapping';
import { executeApiMethodSkill } from './executors/method-api';
import { executeContractMethodSkill } from './executors/method-contract';
import { getTransactionId } from './invokers';
import type { ForestDispatchContext } from './types';
import { executeWorkflowSkill } from './workflow';

async function dispatchForestSkillInternal(
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

    return await executeWorkflowSkill(
      skillName,
      normalizedInput,
      ctx,
      traceId,
      {
        invokeContractFromWorkflow: async (
          innerSkillName,
          method,
          args,
          chain,
          sourceInput,
          sourceTraceId,
        ) =>
          await dispatchForestSkillInternal(
            innerSkillName,
            {
              env: sourceInput.env,
              dryRun: sourceInput.dryRun,
              traceId: sourceTraceId,
              timeoutMs: sourceInput.timeoutMs,
              method,
              args,
              chain,
            },
            ctx,
          ),
        invokeApiFromWorkflow: async (
          innerSkillName,
          action,
          params,
          sourceInput,
          sourceTraceId,
        ) =>
          await dispatchForestSkillInternal(
            innerSkillName,
            {
              env: sourceInput.env,
              dryRun: sourceInput.dryRun,
              traceId: sourceTraceId,
              timeoutMs: sourceInput.timeoutMs,
              action,
              params,
            },
            ctx,
          ),
        getTransactionId,
      },
    );
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

export async function dispatchForestSkill(
  skillName: string,
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
): Promise<ForestEnvelope> {
  return await dispatchForestSkillInternal(skillName, input, ctx);
}
