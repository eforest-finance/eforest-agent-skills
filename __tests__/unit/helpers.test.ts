/**
 * Unit Tests — Pure helper functions: parseSeedSymbolFromLogs, encodeIssueInput, format*
 *
 * Run: cd scripts/skills && bun test
 */
import { describe, test, expect } from 'bun:test';

import { parseSeedSymbolFromLogs } from '../../src/core/seed';
import { encodeIssueInput } from '../../src/core/issue';
import { getWallet } from '../../lib/aelf-client';
import { formatOutput, formatError } from '../../create_token_skill';

const TEST_KEY =
  'e5d0f4b2c8a1f3d6e9b7c0a2d4f6e8b1c3a5d7f9e1b3c5a7d9f1e3b5c7a9d1f2';

// ============================================================================
// formatOutput
// ============================================================================

describe('formatOutput', () => {
  test('returns valid JSON string for success', () => {
    const result = { success: true, transactionId: 'abc123', data: {} };
    const output = formatOutput(result);
    expect(output).toBe(JSON.stringify(result));
    expect(JSON.parse(output)).toEqual(result);
  });

  test('returns valid JSON for dry-run', () => {
    const result = { dryRun: true, steps: ['step1', 'step2'] };
    const output = formatOutput(result);
    const parsed = JSON.parse(output);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.steps).toHaveLength(2);
  });
});

// ============================================================================
// formatError
// ============================================================================

describe('formatError', () => {
  test('formats error with message', () => {
    const err = new Error('something went wrong');
    expect(formatError(err)).toBe('[ERROR] something went wrong');
  });

  test('formats unknown error (null)', () => {
    expect(formatError(null)).toBe('[ERROR] Unknown error');
  });

  test('formats unknown error (undefined)', () => {
    expect(formatError(undefined)).toBe('[ERROR] Unknown error');
  });

  test('formats string error', () => {
    expect(formatError('oops')).toBe('[ERROR] oops');
  });

  test('formats object error via JSON.stringify', () => {
    const err = { code: 42 };
    expect(formatError(err)).toBe('[ERROR] {"code":42}');
  });
});

// ============================================================================
// parseSeedSymbolFromLogs
// ============================================================================

describe('parseSeedSymbolFromLogs', () => {
  test('returns null for empty array', () => {
    expect(parseSeedSymbolFromLogs([])).toBeNull();
  });

  test('returns null for non-array input', () => {
    expect(parseSeedSymbolFromLogs(null as any)).toBeNull();
    expect(parseSeedSymbolFromLogs(undefined as any)).toBeNull();
  });

  test('extracts SEED symbol from SeedCreated Indexed field', () => {
    const seedBytes = Buffer.from([
      0x0a, 0x08, ...Buffer.from('SEED-321'),
    ]);
    const logs = [
      {
        Name: 'SeedCreated',
        Indexed: [seedBytes.toString('base64')],
        NonIndexed: '',
      },
    ];
    expect(parseSeedSymbolFromLogs(logs)).toBe('SEED-321');
  });

  test('extracts SEED symbol from TokenCreated Indexed field', () => {
    const seedBytes = Buffer.from([
      0x0a, 0x08, ...Buffer.from('SEED-999'),
    ]);
    const logs = [
      {
        Name: 'TokenCreated',
        Indexed: [seedBytes.toString('base64')],
      },
    ];
    expect(parseSeedSymbolFromLogs(logs)).toBe('SEED-999');
  });

  test('ignores unrelated log entries', () => {
    const logs = [{ Name: 'Transfer', Indexed: ['abc'], NonIndexed: 'def' }];
    expect(parseSeedSymbolFromLogs(logs)).toBeNull();
  });

  test('extracts from NonIndexed field', () => {
    const seedBytes = Buffer.from([
      0x0a, 0x07, ...Buffer.from('SEED-42'),
    ]);
    const logs = [
      {
        Name: 'SeedCreated',
        Indexed: [],
        NonIndexed: seedBytes.toString('base64'),
      },
    ];
    expect(parseSeedSymbolFromLogs(logs)).toBe('SEED-42');
  });
});

// ============================================================================
// encodeIssueInput
// ============================================================================

describe('encodeIssueInput', () => {
  test('returns Uint8Array for valid params', () => {
    const wallet = getWallet(TEST_KEY);
    const result = encodeIssueInput({
      symbol: 'TEST',
      amount: 100,
      to: wallet.address,
      memo: 'test',
    });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  test('encoded bytes contain the symbol string', () => {
    const wallet = getWallet(TEST_KEY);
    const result = encodeIssueInput({
      symbol: 'MYTOKEN',
      amount: 500,
      to: wallet.address,
      memo: '',
    });
    const decoded = Buffer.from(result).toString('utf-8');
    expect(decoded).toContain('MYTOKEN');
  });
});
