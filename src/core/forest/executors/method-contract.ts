import {
  failureEnvelope,
  successEnvelope,
  type ForestEnvelope,
  type ForestInputEnvelope,
} from '../../../../lib/forest-envelope';
import {
  getContractMode,
  normalizeChain,
  resolveContractAddress,
} from '../address-resolution';
import { defaultContractInvoker, getTransactionId } from '../invokers';
import type { ForestDispatchContext } from '../types';

export async function executeContractMethodSkill(
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
