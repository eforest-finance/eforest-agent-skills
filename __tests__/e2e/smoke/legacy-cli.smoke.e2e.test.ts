import { describe, expect, test } from 'bun:test';

import { runCliJson } from '../helpers/cli';

describe('e2e smoke - legacy CLI (dry-run)', () => {
  test('buy-seed --dry-run returns success json', { timeout: 30000 }, () => {
    const result = runCliJson(
      'bun run create_token_skill.ts buy-seed --symbol E2ESEED --issuer E2E-ISSUER --dry-run',
    );

    expect(result.exitCode).toBe(0);
    expect(result.json.dryRun).toBe(true);
    expect(Array.isArray(result.json.steps)).toBe(true);
  });

  test('create-token --dry-run returns success json', { timeout: 30000 }, () => {
    const result = runCliJson(
      [
        'bun run create_token_skill.ts create-token',
        '--symbol E2ETOKEN',
        "--token-name 'E2E Token'",
        '--seed-symbol SEED-1',
        '--total-supply 1000',
        '--decimals 8',
        '--issue-chain tDVV',
        '--dry-run',
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    expect(result.json.dryRun).toBe(true);
    expect(Array.isArray(result.json.steps)).toBe(true);
  });

  test('issue-token --dry-run returns success json', { timeout: 30000 }, () => {
    const result = runCliJson(
      [
        'bun run create_token_skill.ts issue-token',
        '--symbol E2ETOKEN',
        '--amount 1',
        '--to E2E-TO',
        '--chain tDVV',
        '--dry-run',
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    expect(result.json.dryRun).toBe(true);
    expect(Array.isArray(result.json.steps)).toBe(true);
  });
});
