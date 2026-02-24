import { describe, test, expect } from 'bun:test';

import {
  buildSkillInput,
  parseFieldAssignments,
  parseInputJson,
  parseLooseValue,
  runForestSkill,
  toCliFailureEnvelope,
} from '../../src/cli/forest_skill';

describe('forest skill CLI helpers', () => {
  test('parseLooseValue parses primitive and JSON-like values', () => {
    expect(parseLooseValue('true')).toBe(true);
    expect(parseLooseValue('false')).toBe(false);
    expect(parseLooseValue('123')).toBe(123);
    expect(parseLooseValue('12.5')).toBe(12.5);
    expect(parseLooseValue('{"a":1}')).toEqual({ a: 1 });
    expect(parseLooseValue('[1,2]')).toEqual([1, 2]);
    expect(parseLooseValue('abc')).toBe('abc');
  });

  test('parseFieldAssignments builds nested object', () => {
    const parsed = parseFieldAssignments([
      'payload.symbol=NFT-1',
      'payload.quantity=2',
      'payload.price.amount=1.5',
      'payload.enabled=true',
      'params.filters={"k":"v"}',
    ]);

    expect(parsed).toEqual({
      payload: {
        symbol: 'NFT-1',
        quantity: 2,
        price: { amount: 1.5 },
        enabled: true,
      },
      params: {
        filters: { k: 'v' },
      },
    });
  });

  test('buildSkillInput merges inputJson and field with field priority', () => {
    const input = buildSkillInput({
      env: 'testnet',
      dryRun: true,
      inputJson: JSON.stringify({ payload: { symbol: 'OLD', chain: 'AELF' } }),
      field: ['payload.symbol=NEW', 'payload.amount=1'],
    });

    expect(input).toEqual({
      env: 'testnet',
      dryRun: true,
      payload: {
        symbol: 'NEW',
        chain: 'AELF',
        amount: 1,
      },
    });
  });

  test('parseInputJson rejects invalid JSON root', () => {
    expect(() => parseInputJson('invalid')).toThrow('Invalid --input-json');
    expect(() => parseInputJson('[1,2]')).toThrow(
      'Invalid --input-json. Root value must be an object.',
    );
  });

  test('toCliFailureEnvelope maps invalid input into INVALID_PARAMS', () => {
    const failure = toCliFailureEnvelope(
      new Error('Invalid --input-json. Root value must be an object.'),
      'trace-1',
    );

    expect(failure).toEqual({
      success: false,
      code: 'INVALID_PARAMS',
      message: 'Invalid --input-json. Root value must be an object.',
      retryable: false,
      traceId: 'trace-1',
    });
  });

  test('toCliFailureEnvelope keeps existing FailureEnvelope', () => {
    const existing = {
      success: false as const,
      code: 'SERVICE_DISABLED' as const,
      message: 'service disabled',
      traceId: 'trace-2',
    };
    const failure = toCliFailureEnvelope(existing, 'trace-ignored');
    expect(failure).toEqual(existing);
  });

  test('runForestSkill invokes dispatcher with normalized input', async () => {
    let received: any = null;

    const result = await runForestSkill(
      {
        skill: 'aelf-forest-transfer-item',
        env: 'testnet',
        dryRun: true,
        inputJson: JSON.stringify({ payload: { symbol: 'OLD', chain: 'AELF' } }),
        field: ['payload.symbol=NEW', 'payload.to=addr', 'payload.amount=1'],
      },
      {
        getNetworkConfigImpl: async () => ({
          rpcUrls: {},
          contracts: {},
          walletAddress: 'mock',
        }) as any,
        dispatchForestSkillImpl: async (skillName: string, input: any) => {
          received = { skillName, input };
          return {
            success: true,
            code: 'OK',
            data: { ok: true },
            warnings: [],
          };
        },
      },
    );

    expect(result.success).toBe(true);
    expect(received.skillName).toBe('aelf-forest-transfer-item');
    expect(received.input.env).toBe('testnet');
    expect(received.input.dryRun).toBe(true);
    expect(received.input.payload).toEqual({
      symbol: 'NEW',
      chain: 'AELF',
      to: 'addr',
      amount: 1,
    });
  });
});
