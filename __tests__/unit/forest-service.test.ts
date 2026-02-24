import { afterEach, describe, expect, test } from 'bun:test';

import { Config } from '../../lib/forest-service';

const ENV_KEYS = [
  'EFOREST_DISABLE_ALL_SERVICES',
  'EFOREST_ENABLED_SERVICES',
  'EFOREST_DISABLED_SERVICES',
  'EFOREST_MAINTENANCE_SERVICES',
  'EFOREST_SERVICE_FOREST_MARKET_WORKFLOW',
];

const saved: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) {
  saved[key] = process.env[key];
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

describe('forest service gating', () => {
  test('enabled by default', () => {
    expect(Config.isServiceEnabled('forest.market.workflow')).toBe(true);
  });

  test('disabled by wildcard list', () => {
    process.env.EFOREST_DISABLED_SERVICES = 'forest.market.*';
    expect(Config.isServiceEnabled('forest.market.workflow')).toBe(false);
    expect(Config.isServiceEnabled('forest.quote.workflow')).toBe(true);
  });

  test('maintenance mode by list', () => {
    process.env.EFOREST_MAINTENANCE_SERVICES = 'forest.market.*';
    expect(Config.isServiceEnabled('forest.market.workflow')).toBe(true);
    expect(Config.isServiceInMaintenance('forest.market.workflow')).toBe(true);
  });

  test('explicit key switch has highest priority', () => {
    process.env.EFOREST_SERVICE_FOREST_MARKET_WORKFLOW = 'false';
    expect(Config.isServiceEnabled('forest.market.workflow')).toBe(false);
  });
});
