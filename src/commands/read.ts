import { readFileSync, existsSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { findSkill } from '../utils/skills.js';

/**
 * Read skill to stdout (for AI agents)
 */
export function readSkill(skillName: string): void {
  if (skillName.startsWith('file://')) {
    readSkillFromFileUri(skillName);
    return;
  }

  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    console.error('\nSearched:');
    console.error('  .agent/skills/ (project universal)');
    console.error('  ~/.agent/skills/ (global universal)');
    console.error('  .claude/skills/ (project)');
    console.error('  ~/.claude/skills/ (global)');
    console.error('\nInstall skills: openskills install owner/repo');
    process.exit(1);
  }

  outputSkill(skillName, skill.path, skill.baseDir);
}

function readSkillFromFileUri(uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    console.error(`Error: Invalid file URI '${uri}'`);
    process.exit(1);
  }

  const fsPath = fileURLToPath(parsed);
  if (!existsSync(fsPath)) {
    console.error(`Error: Path not found ${fsPath}`);
    process.exit(1);
  }

  const stats = statSync(fsPath);
  const skillPath = stats.isDirectory() ? join(fsPath, 'SKILL.md') : fsPath;
  const baseDir = stats.isDirectory() ? fsPath : dirname(fsPath);

  if (!existsSync(skillPath)) {
    console.error(`Error: SKILL.md not found at ${skillPath}`);
    process.exit(1);
  }

  outputSkill(uri, skillPath, baseDir);
}

function outputSkill(identifier: string, skillPath: string, baseDir: string): void {
  const content = readFileSync(skillPath, 'utf-8');

  // Output in Claude Code format
  console.log(`Reading: ${identifier}`);
  console.log(`Base directory: ${baseDir}`);
  console.log('');
  console.log(content);
  console.log('');
  console.log(`Skill read: ${identifier}`);
}
