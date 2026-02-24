/**
 * Service switch and maintenance gating for forest skills.
 *
 * No hard-coded provider branching in handlers; all switches route through this
 * config abstraction.
 */

export const FOREST_SERVICE_KEYS = [
  'forest.create.*',
  'forest.market.*',
  'forest.quote.*',
  'forest.drop.*',
  'forest.whitelist.*',
  'forest.ai.*',
  'forest.miniapp.*',
  'forest.profile.*',
  'forest.discover.*',
  'forest.realtime.*',
] as const;

export interface ServiceState {
  enabled: boolean;
  maintenance: boolean;
}

function parsePatterns(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function escapeRegex(text: string): string {
  return text.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function patternToRegExp(pattern: string): RegExp {
  const regexText = `^${escapeRegex(pattern).replace(/\*/g, '.*')}$`;
  return new RegExp(regexText);
}

export function isPatternMatched(value: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (patternToRegExp(pattern).test(value)) {
      return true;
    }
  }
  return false;
}

function getServiceEnvKey(serviceKey: string): string {
  return (
    'EFOREST_SERVICE_' +
    serviceKey
      .replace(/\./g, '_')
      .replace(/\*/g, 'ALL')
      .toUpperCase()
  );
}

function parseBoolean(raw?: string): boolean | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

export class Config {
  static isServiceEnabled(serviceKey: string, env = process.env): boolean {
    return Config.getServiceState(serviceKey, env).enabled;
  }

  static isServiceInMaintenance(serviceKey: string, env = process.env): boolean {
    return Config.getServiceState(serviceKey, env).maintenance;
  }

  static getServiceState(serviceKey: string, env = process.env): ServiceState {
    const disableAll = parseBoolean(env.EFOREST_DISABLE_ALL_SERVICES);
    if (disableAll === true) {
      return { enabled: false, maintenance: true };
    }

    const explicitKey = getServiceEnvKey(serviceKey);
    const explicit = parseBoolean(env[explicitKey]);

    const enabledPatterns = parsePatterns(env.EFOREST_ENABLED_SERVICES);
    const disabledPatterns = parsePatterns(env.EFOREST_DISABLED_SERVICES);
    const maintenancePatterns = parsePatterns(env.EFOREST_MAINTENANCE_SERVICES);

    const inEnabledList =
      enabledPatterns.length === 0 || isPatternMatched(serviceKey, enabledPatterns);
    const inDisabledList = isPatternMatched(serviceKey, disabledPatterns);
    const inMaintenanceList = isPatternMatched(serviceKey, maintenancePatterns);

    if (explicit === false) {
      return { enabled: false, maintenance: true };
    }

    if (!inEnabledList || inDisabledList) {
      return { enabled: false, maintenance: true };
    }

    return { enabled: true, maintenance: inMaintenanceList };
  }
}
