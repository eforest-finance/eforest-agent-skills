import { describe, expect, test } from 'bun:test';

import {
  assertFailureEnvelope,
  assertSuccessEnvelope,
  runCliJson,
} from '../helpers/cli';

describe('e2e full - long-tail forest skills (inputJson dry-run)', () => {
  test('method.api long-tail skill succeeds', { timeout: 30000 }, () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-api-system',
        '--env mainnet',
        '--dry-run',
        `--input-json '{"action":"fetchChainsList","params":{}}'`,
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    assertSuccessEnvelope(result.json);
  });

  test('workflow long-tail skill succeeds', { timeout: 30000 }, () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-miniapp-action',
        '--env mainnet',
        '--dry-run',
        `--input-json '{"action":"userInfo","params":{"address":"E2E-USER"}}'`,
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    assertSuccessEnvelope(result.json);
  });

  test('method.contract maintenance path is stable', { timeout: 120000 }, () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-contract-drop',
        '--env mainnet',
        '--dry-run',
        `--input-json '{"method":"ClaimDrop","chain":"AELF","args":{"dropId":"1"}}'`,
      ].join(' '),
      {
        EFOREST_MAINTENANCE_SERVICES: 'forest.drop.*',
      },
    );

    expect(result.exitCode).toBe(0);
    assertFailureEnvelope(result.json, 'MAINTENANCE');
  });

  test('INVALID_PARAMS mapping is stable', { timeout: 30000 }, () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-api-market',
        '--env mainnet',
        '--dry-run',
        `--input-json '{"params":{"page":1}}'`,
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    assertFailureEnvelope(result.json, 'INVALID_PARAMS');
  });
});
