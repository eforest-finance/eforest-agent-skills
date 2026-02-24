#!/usr/bin/env bun
/**
 * Forest skill CLI runner for OpenClaw and other tool runners.
 */

import { Command } from 'commander';

import { getNetworkConfig, loadEnvFile } from '../../lib/config';
import {
  buildTraceId,
  failureEnvelope,
  type FailureEnvelope,
} from '../../lib/forest-envelope';
import { dispatchForestSkill } from '../core/forest';

loadEnvFile();

export interface ForestSkillRunOptions {
  skill: string;
  env?: string;
  dryRun?: boolean;
  traceId?: string;
  timeoutMs?: number;
  inputJson?: string;
  field?: string[];
  privateKey?: string;
  apiUrl?: string;
  rpcUrl?: string;
}

export interface ForestSkillRunnerDeps {
  getNetworkConfigImpl?: typeof getNetworkConfig;
  dispatchForestSkillImpl?: typeof dispatchForestSkill;
}

function parseErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (!err) return 'Unknown error';

  const anyErr = err as any;
  return (
    anyErr?.message ||
    anyErr?.response?.data?.message ||
    (typeof anyErr === 'object' ? JSON.stringify(anyErr) : String(anyErr)) ||
    'Unknown error'
  );
}

export function formatError(err: unknown): string {
  return `[ERROR] ${parseErrorMessage(err)}`;
}

function isFailureEnvelopeLike(err: unknown): err is FailureEnvelope {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as any;
  return anyErr.success === false && typeof anyErr.code === 'string';
}

export function toCliFailureEnvelope(
  err: unknown,
  traceId?: string,
): FailureEnvelope {
  if (isFailureEnvelopeLike(err)) {
    return err;
  }

  const message = parseErrorMessage(err);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid --input-json') ||
    normalized.includes('invalid --field assignment') ||
    normalized.includes('missing required parameter') ||
    normalized.includes('unknown option') ||
    normalized.includes('unknown command') ||
    normalized.includes('root value must be an object')
  ) {
    return failureEnvelope('INVALID_PARAMS', message, {
      traceId,
      retryable: false,
    });
  }

  if (normalized.includes('service disabled')) {
    return failureEnvelope('SERVICE_DISABLED', message, {
      traceId,
      retryable: false,
    });
  }

  if (normalized.includes('maintenance')) {
    return failureEnvelope('MAINTENANCE', message, {
      traceId,
      maintenance: true,
      retryable: true,
    });
  }

  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return failureEnvelope('TX_TIMEOUT', message, {
      traceId,
      retryable: true,
    });
  }

  return failureEnvelope('INTERNAL_ERROR', message, {
    traceId,
    retryable: false,
  });
}

export function parseLooseValue(rawValue: string): any {
  const value = rawValue.trim();

  if (value.length === 0) return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }

  if (
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']')) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}

function assertSafePath(path: string): void {
  const segments = path.split('.');
  for (const segment of segments) {
    if (!segment) {
      throw new Error(`Invalid field path "${path}": empty segment.`);
    }
    if (segment === '__proto__' || segment === 'prototype' || segment === 'constructor') {
      throw new Error(`Invalid field path "${path}": unsafe key.`);
    }
  }
}

export function setByPath(target: Record<string, any>, path: string, value: any): void {
  assertSafePath(path);

  const segments = path.split('.');
  let cursor: Record<string, any> = target;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (isLast) {
      cursor[segment] = value;
      return;
    }

    const next = cursor[segment];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
}

export function parseFieldAssignments(assignments: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const item of assignments) {
    const eqIdx = item.indexOf('=');
    if (eqIdx <= 0) {
      throw new Error(
        `Invalid --field assignment "${item}". Expected format: path=value`,
      );
    }

    const path = item.slice(0, eqIdx).trim();
    const rawValue = item.slice(eqIdx + 1);
    const parsedValue = parseLooseValue(rawValue);

    setByPath(result, path, parsedValue);
  }

  return result;
}

export function parseInputJson(inputJson?: string): Record<string, any> {
  if (!inputJson) return {};

  let parsed: any;
  try {
    parsed = JSON.parse(inputJson);
  } catch (err) {
    throw new Error(`Invalid --input-json. ${parseErrorMessage(err)}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid --input-json. Root value must be an object.');
  }

  return parsed;
}

export function buildSkillInput(opts: ForestSkillRunOptions): Record<string, any> {
  const mergedInput = parseInputJson(opts.inputJson);

  // Apply field assignments on top of inputJson so path-level overrides keep
  // untouched sibling keys (deep merge behavior).
  for (const item of opts.field || []) {
    const eqIdx = item.indexOf('=');
    if (eqIdx <= 0) {
      throw new Error(
        `Invalid --field assignment "${item}". Expected format: path=value`,
      );
    }

    const path = item.slice(0, eqIdx).trim();
    const rawValue = item.slice(eqIdx + 1);
    setByPath(mergedInput, path, parseLooseValue(rawValue));
  }

  return {
    ...mergedInput,
    env: opts.env || 'mainnet',
    dryRun: !!opts.dryRun,
    ...(opts.traceId ? { traceId: opts.traceId } : {}),
    ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
  };
}

export async function runForestSkill(
  opts: ForestSkillRunOptions,
  deps: ForestSkillRunnerDeps = {},
): Promise<Record<string, any>> {
  const getNetworkConfigImpl = deps.getNetworkConfigImpl || getNetworkConfig;
  const dispatchForestSkillImpl = deps.dispatchForestSkillImpl || dispatchForestSkill;

  if (!opts.skill) {
    throw new Error('Missing required parameter: --skill');
  }

  const env = opts.env || 'mainnet';
  const input = buildSkillInput({ ...opts, env });

  const config = await getNetworkConfigImpl({
    env,
    privateKey: opts.privateKey,
    apiUrl: opts.apiUrl,
    rpcUrl: opts.rpcUrl,
  });

  return await dispatchForestSkillImpl(opts.skill, input, { config });
}

const program = new Command();
program
  .name('forest-skill')
  .description('Run a forest skill via unified dispatcher')
  .version('0.4.0');

program
  .command('run')
  .description('Run one forest skill')
  .requiredOption('--skill <name>', 'Skill name, e.g. aelf-forest-get-price-quote')
  .option('--env <env>', 'Environment: mainnet | testnet', 'mainnet')
  .option('--dry-run', 'Run in dryRun mode', false)
  .option('--trace-id <id>', 'Optional traceId for observability')
  .option('--timeout-ms <ms>', 'Optional timeout (1000~180000)', (x) => Number(x))
  .option(
    '--field <path=value>',
    'Structured field assignment; repeatable, e.g. --field payload.symbol=ABC',
    (value, prev: string[]) => {
      prev.push(value);
      return prev;
    },
    [] as string[],
  )
  .option('--input-json <json>', 'Raw JSON object input; merged with --field')
  .option('--private-key <key>', 'Override private key for this call')
  .option('--api-url <url>', 'Override backend API URL')
  .option('--rpc-url <url>', 'Override AELF MainChain RPC URL')
  .action(async (opts) => {
    try {
      const result = await runForestSkill(opts);
      console.log(JSON.stringify(result));
    } catch (err) {
      const traceId = opts.traceId || buildTraceId(undefined, opts.skill);
      const failure = toCliFailureEnvelope(err, traceId);
      console.log(JSON.stringify(failure));
      process.exit(1);
    }
  });

const isMainModule =
  typeof Bun !== 'undefined'
    ? Bun.main === import.meta.path
    : process.argv[1]?.endsWith('forest_skill.ts');

if (isMainModule) {
  program.parse();
}

export { program };
