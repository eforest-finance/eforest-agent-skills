import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { setupOpenClaw, uninstallOpenClaw } from '../../bin/platforms/openclaw';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('openclaw setup/uninstall', () => {
  test('setupOpenClaw merges all package skills and updates working_directory', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'openclaw-setup-'));
    tempDirs.push(dir);

    const configPath = path.join(dir, 'openclaw.json');
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

    const ok = setupOpenClaw({
      configPath,
      cwd: '/tmp/openclaw-cwd',
      force: true,
    });
    expect(ok).toBe(true);

    const content = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(content.skills.length).toBe(49);

    const forestEntry = content.skills.find(
      (x: any) => x.name === 'aelf-forest-create-item',
    );
    expect(forestEntry).toBeDefined();
    expect(forestEntry.working_directory).toBe('/tmp/openclaw-cwd');
  });

  test('uninstallOpenClaw removes all package-owned skills and keeps external ones', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'openclaw-uninstall-'));
    tempDirs.push(dir);

    const configPath = path.join(dir, 'openclaw.json');

    const setupOk = setupOpenClaw({
      configPath,
      cwd: '/tmp/openclaw-cwd',
      force: true,
    });
    expect(setupOk).toBe(true);

    const before = JSON.parse(readFileSync(configPath, 'utf-8'));
    before.skills.push({
      name: 'external-skill',
      command: 'echo hello',
      description: 'external',
      working_directory: '.',
      parameters: {},
    });
    writeFileSync(configPath, JSON.stringify(before, null, 2), 'utf-8');

    const uninstallOk = uninstallOpenClaw({ configPath });
    expect(uninstallOk).toBe(true);

    const after = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(after.skills).toHaveLength(1);
    expect(after.skills[0].name).toBe('external-skill');
  });
});
