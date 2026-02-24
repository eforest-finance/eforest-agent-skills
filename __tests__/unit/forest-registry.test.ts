import { describe, test, expect } from 'bun:test';

import {
  FOREST_SKILLS,
  listForestSkillsByTier,
} from '../../lib/forest-skill-registry';
import { hasForestSchema } from '../../lib/forest-schemas';

describe('forest skill registry', () => {
  test('contains all planned skills', () => {
    expect(Object.keys(FOREST_SKILLS).length).toBe(45);
  });

  test('all skills bind existing input/output schemas', () => {
    for (const skill of Object.values(FOREST_SKILLS)) {
      expect(hasForestSchema(skill.in)).toBe(true);
      expect(hasForestSchema(skill.out)).toBe(true);
      expect(skill.serviceKey.startsWith('forest.')).toBe(true);
    }
  });

  test('tier split matches P0/P1/P2 boundaries', () => {
    expect(listForestSkillsByTier('P0').length).toBe(20);
    expect(listForestSkillsByTier('P1').length).toBe(11);
    expect(listForestSkillsByTier('P2').length).toBe(14);
  });
});
