import { expect } from 'bun:test';
import { resolve } from 'path';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const TEST_PRIVATE_KEY =
  'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1f2';

export interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  envOverrides: Record<string, string> = {},
): CliRunResult {
  const proc = Bun.spawnSync({
    cmd: ['zsh', '-lc', command],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      EFOREST_NETWORK: 'mainnet',
      AELF_PRIVATE_KEY: TEST_PRIVATE_KEY,
      ...envOverrides,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  return {
    exitCode: proc.exitCode ?? 1,
    stdout: Buffer.from(proc.stdout).toString('utf-8').trim(),
    stderr: Buffer.from(proc.stderr).toString('utf-8').trim(),
  };
}

export function runCliJson(
  command: string,
  envOverrides: Record<string, string> = {},
): CliRunResult & { json: any } {
  const result = runCommand(command, envOverrides);
  const lastLine = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();

  if (!lastLine) {
    throw new Error(
      `No JSON stdout captured.\ncommand=${command}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(lastLine);
  } catch {
    throw new Error(
      `Invalid JSON stdout.\ncommand=${command}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
  }

  return { ...result, json: parsed };
}

export function assertSuccessEnvelope(payload: any): void {
  expect(payload).toBeDefined();
  expect(payload.success).toBe(true);
  expect(payload.code).toBe('OK');
  expect(typeof payload.data).toBe('object');
  expect(Array.isArray(payload.warnings)).toBe(true);
}

export function assertFailureEnvelope(
  payload: any,
  expectedCode?: string,
): void {
  expect(payload).toBeDefined();
  expect(payload.success).toBe(false);
  expect(typeof payload.message).toBe('string');
  if (expectedCode) {
    expect(payload.code).toBe(expectedCode);
  } else {
    expect(typeof payload.code).toBe('string');
  }
}
