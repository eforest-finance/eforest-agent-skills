import { describe, expect, test } from 'bun:test';

import {
  assertFailureEnvelope,
  assertSuccessEnvelope,
  runCliJson,
} from '../helpers/cli';

describe('e2e smoke - forest CLI', () => {
  test(
    'structured mode skill call succeeds (aelf-forest-list-item dry-run)',
    { timeout: 30000 },
    () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-list-item',
        '--env mainnet',
        '--dry-run',
        '--field payload.symbol=E2E-NFT-1',
        '--field payload.quantity=1',
        '--field payload.price.symbol=ELF',
        '--field payload.price.amount=1',
        `--field payload.duration='{"hours":24}'`,
        '--field payload.chain=tDVV',
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    assertSuccessEnvelope(result.json);
    },
  );

  test(
    'inputJson mode skill call succeeds (aelf-forest-api-market dry-run)',
    { timeout: 30000 },
    () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-api-market',
        '--env mainnet',
        '--dry-run',
        `--input-json '{"action":"fetchTokens","params":{"chainId":"AELF","page":1}}'`,
      ].join(' '),
    );

    expect(result.exitCode).toBe(0);
    assertSuccessEnvelope(result.json);
    },
  );

  test(
    'invalid inputJson returns FailureEnvelope.code=INVALID_PARAMS',
    { timeout: 30000 },
    () => {
    const result = runCliJson(
      [
        'bun run src/cli/forest_skill.ts run',
        '--skill aelf-forest-api-market',
        '--env mainnet',
        '--dry-run',
        `--input-json '[1,2]'`,
      ].join(' '),
    );

    expect(result.exitCode).toBe(1);
    assertFailureEnvelope(result.json, 'INVALID_PARAMS');
    },
  );
});
