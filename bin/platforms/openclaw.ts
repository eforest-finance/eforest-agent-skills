// ============================================================
// Setup: OpenClaw — register tools from openclaw.json
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { getPackageRoot, readJsonFile, writeJsonFile, LOG } from './utils';

type OpenClawTool = {
  name: string;
  description?: string;
  command?: string;
  args?: string[];
  cwd?: string;
  inputSchema?: Record<string, unknown>;
  [key: string]: unknown;
};

const LEGACY_FALLBACK_TOOL_NAMES = new Set([
  'aelf-buy-seed',
  'aelf-create-token',
  'aelf-issue-token',
]);

function getPackageOpenClawSourceFile(): string {
  return path.join(getPackageRoot(), 'openclaw.json');
}

function loadSourceTools(): OpenClawTool[] {
  const sourceFile = getPackageOpenClawSourceFile();
  const source = readJsonFile(sourceFile);

  if (Array.isArray(source.tools)) {
    return source.tools as OpenClawTool[];
  }

  if (Array.isArray(source.skills)) {
    // Backward-compat: transform legacy skills to tools on read.
    return (source.skills as any[]).map((skill) => ({
      name: skill?.name,
      description: skill?.description,
      command: 'sh',
      args: ['-lc', String(skill?.command || '')],
      cwd: skill?.working_directory || '.',
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(skill?.parameters || {}).map(([key, value]: [string, any]) => [
            key,
            {
              type: value?.type || 'string',
              description: value?.description || `${key} parameter`,
              ...(value?.default === undefined ? {} : { default: value.default }),
            },
          ]),
        ),
        required: Object.entries(skill?.parameters || {})
          .filter(([, value]: [string, any]) => Boolean(value?.required))
          .map(([key]) => key),
        additionalProperties: true,
      },
    }));
  }

  return [];
}

function getPackageToolNames(): Set<string> {
  const tools = loadSourceTools();
  const dynamicNames = new Set(
    tools
      .map((tool) => tool?.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
  );

  if (dynamicNames.size > 0) {
    return dynamicNames;
  }

  return LEGACY_FALLBACK_TOOL_NAMES;
}

export function setupOpenClaw(opts: {
  configPath?: string;
  cwd?: string;
  force?: boolean;
}): boolean {
  const sourceFile = getPackageOpenClawSourceFile();

  if (!fs.existsSync(sourceFile)) {
    LOG.error(`openclaw.json not found at ${sourceFile}`);
    return false;
  }

  const tools = loadSourceTools();
  if (!tools.length) {
    LOG.error('No tools found in openclaw.json');
    return false;
  }

  const resolvedCwd = opts.cwd || getPackageRoot();
  const updatedTools = tools.map((tool) => ({
    ...tool,
    cwd: resolvedCwd,
  }));

  if (opts.configPath) {
    LOG.step(`Merging ${updatedTools.length} tools into: ${opts.configPath}`);

    const existing = readJsonFile(opts.configPath);
    if (!Array.isArray(existing.tools)) {
      existing.tools = [];
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const tool of updatedTools) {
      const idx = existing.tools.findIndex((item: OpenClawTool) => item.name === tool.name);
      if (idx >= 0) {
        if (opts.force) {
          existing.tools[idx] = tool;
          updated += 1;
        } else {
          skipped += 1;
        }
      } else {
        existing.tools.push(tool);
        added += 1;
      }
    }

    writeJsonFile(opts.configPath, existing);
    LOG.success(`OpenClaw config updated: ${added} added, ${updated} updated, ${skipped} skipped.`);
    if (skipped > 0) {
      LOG.info('Use --force to overwrite existing tools.');
    }
  } else {
    const outPath = path.join(process.cwd(), 'eforest-openclaw.json');
    LOG.step(`Generating OpenClaw config: ${outPath}`);
    LOG.step(`Tool cwd: ${resolvedCwd}`);

    writeJsonFile(outPath, {
      name: 'eforest-agent-skills',
      description: 'eForest OpenClaw tools',
      tools: updatedTools,
    });
    LOG.success(`OpenClaw config generated: ${outPath}`);
    LOG.info(`Contains ${updatedTools.length} tools with cwd set to: ${resolvedCwd}`);
    LOG.info('Import this file into your OpenClaw configuration.');
  }

  return true;
}

export function uninstallOpenClaw(opts: { configPath?: string }): boolean {
  if (!opts.configPath) {
    LOG.info('OpenClaw: no --config-path specified. Remove tools manually from your OpenClaw config.');
    return false;
  }

  const existing = readJsonFile(opts.configPath);
  if (!Array.isArray(existing.tools) || existing.tools.length === 0) {
    LOG.info('No tools found in config.');
    return false;
  }

  const toolNames = getPackageToolNames();

  const before = existing.tools.length;
  existing.tools = existing.tools.filter((tool: OpenClawTool) => !toolNames.has(tool.name));
  const removed = before - existing.tools.length;

  if (removed === 0) {
    LOG.info('No eForest tools found in config.');
    return false;
  }

  writeJsonFile(opts.configPath, existing);
  LOG.success(`Removed ${removed} eForest tools from OpenClaw config.`);
  return true;
}
