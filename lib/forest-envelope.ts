/**
 * Forest skill unified request/response envelopes.
 */

export type ForestEnv = 'mainnet' | 'testnet';

export interface ForestInputEnvelope {
  env?: ForestEnv;
  dryRun?: boolean;
  traceId?: string;
  timeoutMs?: number;
  [key: string]: any;
}

export type ForestFailureCode =
  | 'INVALID_PARAMS'
  | 'SERVICE_DISABLED'
  | 'MAINTENANCE'
  | 'UPSTREAM_ERROR'
  | 'ONCHAIN_REVERT'
  | 'TX_TIMEOUT'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface SuccessEnvelope<T = Record<string, any>> {
  success: true;
  code: 'OK';
  data: T;
  warnings: string[];
  traceId?: string;
}

export interface FailureEnvelope {
  success: false;
  code: ForestFailureCode;
  message: string;
  maintenance?: boolean;
  retryable?: boolean;
  traceId?: string;
  details?: Record<string, any>;
}

export type ForestEnvelope<T = Record<string, any>> =
  | SuccessEnvelope<T>
  | FailureEnvelope;

export interface FailureOptions {
  maintenance?: boolean;
  retryable?: boolean;
  traceId?: string;
  details?: Record<string, any>;
}

export function ensureInputEnvelope<T extends ForestInputEnvelope>(
  input: T,
): T & Required<Pick<ForestInputEnvelope, 'env' | 'dryRun'>> {
  return {
    env: 'mainnet',
    dryRun: false,
    ...input,
  };
}

export function buildTraceId(inputTraceId?: string, skillName?: string): string {
  if (inputTraceId) return inputTraceId;
  const prefix = skillName || 'forest';
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function successEnvelope<T>(
  data: T,
  traceId?: string,
  warnings: string[] = [],
): SuccessEnvelope<T> {
  return {
    success: true,
    code: 'OK',
    data,
    warnings,
    ...(traceId ? { traceId } : {}),
  };
}

export function failureEnvelope(
  code: ForestFailureCode,
  message: string,
  opts: FailureOptions = {},
): FailureEnvelope {
  return {
    success: false,
    code,
    message,
    ...(opts.maintenance === undefined
      ? {}
      : { maintenance: opts.maintenance }),
    ...(opts.retryable === undefined ? {} : { retryable: opts.retryable }),
    ...(opts.traceId ? { traceId: opts.traceId } : {}),
    ...(opts.details ? { details: opts.details } : {}),
  };
}

export function isFailureEnvelope(
  result: ForestEnvelope<any>,
): result is FailureEnvelope {
  return result.success === false;
}

export function isSuccessEnvelope<T>(
  result: ForestEnvelope<T>,
): result is SuccessEnvelope<T> {
  return result.success === true;
}
