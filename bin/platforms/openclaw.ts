// ============================================================
// Setup: OpenClaw — register skills from openclaw.json
// ============================================================

import * as path from 'path';
import * as fs from 'fs';
import { getPackageRoot, readJsonFile, writeJsonFile, LOG } from './utils';

/**
 * Backward-compatible fallback names if openclaw.json cannot be read.
 * @deprecated Use dynamic names loaded from openclaw.json.
 */
const LEGACY_FALLBACK_SKILL_NAMES = new Set([
  'aelf-buy-seed',
  'aelf-create-token',
  'aelf-issue-token',
]);

function getPackageOpenClawSourceFile(): string {
  const packageRoot = getPackageRoot();
  return path.join(packageRoot, 'openclaw.json');
}

function getPackageSkillNames(): Set<string> {
  const sourceFile = getPackageOpenClawSourceFile();
  const source = readJsonFile(sourceFile);
  const skills: any[] = source.skills || [];
  const dynamicNames = new Set<string>(
    skills
      .map((skill) => skill?.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
  );

  if (dynamicNames.size > 0) {
    return dynamicNames;
  }

  return LEGACY_FALLBACK_SKILL_NAMES;
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

  const source = readJsonFile(sourceFile);
  const skills: any[] = source.skills || [];

  if (!skills.length) {
    LOG.error('No skills found in openclaw.json');
    return false;
  }

  // Resolve working_directory for all skills — use explicit cwd, or package root
  const resolvedCwd = opts.cwd || getPackageRoot();

  const updatedSkills = skills.map((skill: any) => ({
    ...skill,
    working_directory: resolvedCwd,
  }));

  // If user specified a target config path, merge into it
  if (opts.configPath) {
    LOG.step(`Merging ${skills.length} skills into: ${opts.configPath}`);

    const existing = readJsonFile(opts.configPath);
    if (!existing.skills) existing.skills = [];

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const skill of updatedSkills) {
      const idx = existing.skills.findIndex(
        (s: any) => s.name === skill.name,
      );
      if (idx >= 0) {
        if (opts.force) {
          existing.skills[idx] = skill;
          updated++;
        } else {
          skipped++;
        }
      } else {
        existing.skills.push(skill);
        added++;
      }
    }

    writeJsonFile(opts.configPath, existing);
    LOG.success(
      `OpenClaw config updated: ${added} added, ${updated} updated, ${skipped} skipped.`,
    );
    if (skipped > 0) {
      LOG.info('Use --force to overwrite existing skills.');
    }
  } else {
    // No target path: generate a standalone config file in current dir
    const outPath = path.join(process.cwd(), 'eforest-openclaw.json');
    LOG.step(`Generating OpenClaw config: ${outPath}`);
    LOG.step(`Skill working_directory: ${resolvedCwd}`);

    writeJsonFile(outPath, { skills: updatedSkills });
    LOG.success(`OpenClaw config generated: ${outPath}`);
    LOG.info(
      `Contains ${updatedSkills.length} skills with working_directory set to: ${resolvedCwd}`,
    );
    LOG.info('Import this file into your OpenClaw configuration.');
  }

  return true;
}

export function uninstallOpenClaw(opts: { configPath?: string }): boolean {
  if (!opts.configPath) {
    LOG.info(
      'OpenClaw: no --config-path specified. Remove skills manually from your OpenClaw config.',
    );
    return false;
  }

  const existing = readJsonFile(opts.configPath);
  if (!existing.skills?.length) {
    LOG.info('No skills found in config.');
    return false;
  }

  const skillNames = getPackageSkillNames();

  const before = existing.skills.length;
  existing.skills = existing.skills.filter(
    (s: any) => !skillNames.has(s.name),
  );
  const removed = before - existing.skills.length;

  if (removed === 0) {
    LOG.info('No eForest skills found in config.');
    return false;
  }

  writeJsonFile(opts.configPath, existing);
  LOG.success(`Removed ${removed} eForest skills from OpenClaw config.`);
  return true;
}
