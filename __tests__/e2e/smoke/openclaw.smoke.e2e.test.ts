import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import { runCommand } from '../helpers/cli';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const OPENCLAW_PATH = resolve(REPO_ROOT, 'openclaw.json');

describe('e2e smoke - OpenClaw setup flow', () => {
  test('generate-openclaw generates 48 skills', { timeout: 30000 }, () => {
    const original = readFileSync(OPENCLAW_PATH, 'utf-8');

    try {
      const result = runCommand('bun run generate:openclaw');
      expect(result.exitCode).toBe(0);

      const generated = JSON.parse(readFileSync(OPENCLAW_PATH, 'utf-8'));
      expect(Array.isArray(generated.skills)).toBe(true);
      expect(generated.skills.length).toBe(48);
    } finally {
      writeFileSync(OPENCLAW_PATH, original, 'utf-8');
    }
  });

  test(
    'setup/uninstall OpenClaw merges then removes package-owned skills',
    { timeout: 30000 },
    () => {
    const dir = mkdtempSync(join(tmpdir(), 'eforest-openclaw-e2e-'));
    const configPath = join(dir, 'openclaw.json');

    try {
      writeFileSync(
        configPath,
        JSON.stringify(
          {
            skills: [
              {
                name: 'external-skill',
                command: 'echo hello',
                description: 'external',
                working_directory: '.',
                parameters: {},
              },
            ],
          },
          null,
          2,
        ),
        'utf-8',
      );

      const setupResult = runCommand(
        `bun run setup openclaw --config-path '${configPath}' --cwd '${dir}' --force`,
      );
      expect(setupResult.exitCode).toBe(0);

      const setupConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(setupConfig.skills.length).toBe(49);
      expect(
        setupConfig.skills.some((x: any) => x.name === 'aelf-forest-create-item'),
      ).toBe(true);

      const uninstallResult = runCommand(
        `bun run setup uninstall openclaw --config-path '${configPath}'`,
      );
      expect(uninstallResult.exitCode).toBe(0);

      const uninstallConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(uninstallConfig.skills).toHaveLength(1);
      expect(uninstallConfig.skills[0].name).toBe('external-skill');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    },
  );
});
