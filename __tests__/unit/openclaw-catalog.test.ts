import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import * as path from 'path';

import {
  HIGH_FREQUENCY_FOREST_SKILLS,
  buildOpenClawConfig,
} from '../../bin/generate-openclaw';
import { FOREST_SKILLS } from '../../lib/forest-skill-registry';

const HIGH_FREQ_SET = new Set(HIGH_FREQUENCY_FOREST_SKILLS);

describe('openclaw catalog generation', () => {
  test('contains 48 tools (3 legacy + 45 forest) and no duplicate names', () => {
    const config = buildOpenClawConfig();
    const names = config.tools.map((tool) => tool.name);

    expect(config.tools.length).toBe(48);
    expect(new Set(names).size).toBe(48);

    expect(names).toContain('aelf-buy-seed');
    expect(names).toContain('aelf-create-token');
    expect(names).toContain('aelf-issue-token');

    for (const forestSkillName of Object.keys(FOREST_SKILLS)) {
      expect(names).toContain(forestSkillName);
    }
  });

  test('high-frequency skills use structured parameters without required inputJson', () => {
    const config = buildOpenClawConfig();

    for (const skillName of HIGH_FREQ_SET) {
      const entry = config.tools.find((tool) => tool.name === skillName);
      expect(entry).toBeDefined();
      expect(entry?.args[1]?.includes('--field')).toBe(true);

      const required = Array.isArray(entry?.inputSchema.required)
        ? entry?.inputSchema.required
        : [];
      expect(required.includes('inputJson')).toBe(false);
    }
  });

  test('long-tail forest skills require inputJson', () => {
    const config = buildOpenClawConfig();

    for (const forestSkillName of Object.keys(FOREST_SKILLS)) {
      if (HIGH_FREQ_SET.has(forestSkillName as any)) continue;
      const entry = config.tools.find((tool) => tool.name === forestSkillName);
      expect(entry).toBeDefined();
      const required = Array.isArray(entry?.inputSchema.required)
        ? entry?.inputSchema.required
        : [];
      expect(required.includes('inputJson')).toBe(true);
      expect(entry?.args[1]?.includes("--input-json '{{inputJson}}'")).toBe(
        true,
      );
    }
  });

  test('openclaw.json stays aligned with generated config', () => {
    const config = buildOpenClawConfig();
    const filePath = path.join(import.meta.dir, '..', '..', 'openclaw.json');
    const fileConfig = JSON.parse(readFileSync(filePath, 'utf-8'));

    expect(fileConfig).toEqual(config);
  });
});
