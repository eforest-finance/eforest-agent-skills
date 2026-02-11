/**
 * Unit Tests — Setup CLI utilities
 *
 * Run: cd scripts/skills && bun test __tests__/unit/setup.test.ts
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  getPackageRoot,
  getMcpServerPath,
  readJsonFile,
  writeJsonFile,
  generateMcpEntry,
  mergeMcpConfig,
  removeMcpEntry,
  SERVER_NAME,
  type McpServerEntry,
} from '../../bin/platforms/utils';

// ============================================================================
// Path detection
// ============================================================================

describe('getPackageRoot', () => {
  test('resolves to the skills directory', () => {
    const root = getPackageRoot();
    // Should end with scripts/skills (or the package root)
    expect(root).toBeDefined();
    expect(typeof root).toBe('string');
    // package.json must exist at the root
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
  });
});

describe('getMcpServerPath', () => {
  test('resolves to src/mcp/server.ts', () => {
    const serverPath = getMcpServerPath();
    expect(serverPath).toContain('src');
    expect(serverPath).toContain('mcp');
    expect(serverPath).toContain('server.ts');
    // File should actually exist
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});

// ============================================================================
// JSON file operations
// ============================================================================

describe('readJsonFile', () => {
  test('returns empty object for non-existent file', () => {
    const result = readJsonFile('/tmp/__nonexistent_test_file__.json');
    expect(result).toEqual({});
  });

  test('reads valid JSON file', () => {
    const tmpPath = path.join(os.tmpdir(), `test-read-${Date.now()}.json`);
    fs.writeFileSync(tmpPath, '{"key": "value"}', 'utf-8');
    try {
      const result = readJsonFile(tmpPath);
      expect(result).toEqual({ key: 'value' });
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  test('returns empty object for invalid JSON', () => {
    const tmpPath = path.join(os.tmpdir(), `test-invalid-${Date.now()}.json`);
    fs.writeFileSync(tmpPath, 'not json!', 'utf-8');
    try {
      const result = readJsonFile(tmpPath);
      expect(result).toEqual({});
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });
});

describe('writeJsonFile', () => {
  test('writes JSON with pretty formatting', () => {
    const tmpPath = path.join(os.tmpdir(), `test-write-${Date.now()}.json`);
    try {
      writeJsonFile(tmpPath, { hello: 'world' });
      const content = fs.readFileSync(tmpPath, 'utf-8');
      expect(content).toContain('"hello": "world"');
      // Ends with newline
      expect(content.endsWith('\n')).toBe(true);
      // Valid JSON
      expect(JSON.parse(content)).toEqual({ hello: 'world' });
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  });

  test('creates parent directories if needed', () => {
    const tmpDir = path.join(
      os.tmpdir(),
      `test-mkdir-${Date.now()}`,
      'nested',
    );
    const tmpPath = path.join(tmpDir, 'config.json');
    try {
      writeJsonFile(tmpPath, { nested: true });
      expect(fs.existsSync(tmpPath)).toBe(true);
      expect(JSON.parse(fs.readFileSync(tmpPath, 'utf-8'))).toEqual({
        nested: true,
      });
    } finally {
      // Clean up
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
      const parent = path.dirname(tmpDir);
      if (fs.existsSync(parent)) fs.rmdirSync(parent);
    }
  });
});

// ============================================================================
// MCP config generation
// ============================================================================

describe('generateMcpEntry', () => {
  test('returns correct structure', () => {
    const entry = generateMcpEntry();
    expect(entry).toBeDefined();
    expect(typeof entry.command).toBe('string');
    expect(Array.isArray(entry.args)).toBe(true);
    expect(entry.args[0]).toBe('run');
    expect(entry.args[1]).toContain('server.ts');
    expect(entry.env).toBeDefined();
    expect(entry.env.AELF_PRIVATE_KEY).toBe('<YOUR_PRIVATE_KEY>');
    expect(entry.env.EFOREST_NETWORK).toBe('mainnet');
  });

  test('accepts custom server path', () => {
    const entry = generateMcpEntry('/custom/path/server.ts');
    expect(entry.args[1]).toBe('/custom/path/server.ts');
  });
});

describe('SERVER_NAME', () => {
  test('is eforest-token', () => {
    expect(SERVER_NAME).toBe('eforest-token');
  });
});

// ============================================================================
// mergeMcpConfig
// ============================================================================

describe('mergeMcpConfig', () => {
  const mockEntry: McpServerEntry = {
    command: 'bun',
    args: ['run', 'server.ts'],
    env: { KEY: 'val' },
  };

  test('creates new entry in empty config', () => {
    const { config, action } = mergeMcpConfig({}, 'test-server', mockEntry);
    expect(action).toBe('created');
    expect(config.mcpServers['test-server']).toEqual(mockEntry);
  });

  test('creates entry alongside existing servers', () => {
    const existing = {
      mcpServers: {
        'other-server': { command: 'node', args: ['other.js'], env: {} },
      },
    };
    const { config, action } = mergeMcpConfig(
      existing,
      'test-server',
      mockEntry,
    );
    expect(action).toBe('created');
    // Other server untouched
    expect(config.mcpServers['other-server'].command).toBe('node');
    // New server added
    expect(config.mcpServers['test-server']).toEqual(mockEntry);
  });

  test('skips when entry already exists (no force)', () => {
    const existing = {
      mcpServers: {
        'test-server': { command: 'old', args: [], env: {} },
      },
    };
    const { config, action } = mergeMcpConfig(
      existing,
      'test-server',
      mockEntry,
      false,
    );
    expect(action).toBe('skipped');
    // Old entry preserved
    expect(config.mcpServers['test-server'].command).toBe('old');
  });

  test('overwrites when force=true', () => {
    const existing = {
      mcpServers: {
        'test-server': { command: 'old', args: [], env: {} },
      },
    };
    const { config, action } = mergeMcpConfig(
      existing,
      'test-server',
      mockEntry,
      true,
    );
    expect(action).toBe('updated');
    expect(config.mcpServers['test-server']).toEqual(mockEntry);
  });
});

// ============================================================================
// removeMcpEntry
// ============================================================================

describe('removeMcpEntry', () => {
  test('removes existing entry', () => {
    const existing = {
      mcpServers: {
        'test-server': { command: 'bun', args: [], env: {} },
        'other-server': { command: 'node', args: [], env: {} },
      },
    };
    const { config, removed } = removeMcpEntry(existing, 'test-server');
    expect(removed).toBe(true);
    expect(config.mcpServers['test-server']).toBeUndefined();
    // Other server untouched
    expect(config.mcpServers['other-server']).toBeDefined();
  });

  test('returns removed=false when entry does not exist', () => {
    const existing = {
      mcpServers: {
        'other-server': { command: 'node', args: [], env: {} },
      },
    };
    const { config, removed } = removeMcpEntry(existing, 'test-server');
    expect(removed).toBe(false);
    expect(config.mcpServers['other-server']).toBeDefined();
  });

  test('handles empty config', () => {
    const { config, removed } = removeMcpEntry({}, 'test-server');
    expect(removed).toBe(false);
  });

  test('handles config without mcpServers key', () => {
    const { config, removed } = removeMcpEntry(
      { other: 'data' },
      'test-server',
    );
    expect(removed).toBe(false);
    expect(config.other).toBe('data');
  });
});
