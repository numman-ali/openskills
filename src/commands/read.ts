import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';
import { normalizeSkillNames } from '../utils/skill-names.js';

/**
 * Read skill to stdout (for AI agents)
 */
export function readSkill(skillNames: string[] | string): void {
  const names = normalizeSkillNames(skillNames);
  if (names.length === 0) {
    console.error('Error: No skill names provided');
    process.exit(1);
  }
  const resolved = [];
  const missing = [];

  for (const name of names) {
    const skill = findSkill(name);
    if (!skill) {
      missing.push(name);
      continue;
    }
    resolved.push({ name, skill });
  }

  if (missing.length > 0) {
    console.error(`Error: Skill(s) not found: ${missing.join(', ')}`);
    console.error('\nSearched:');
    console.error('  .agent/skills/ (project universal)');
    console.error('  ~/.agent/skills/ (global universal)');
    console.error('  .claude/skills/ (project)');
    console.error('  ~/.claude/skills/ (global)');
    console.error('\nInstall skills: npx openskills install owner/repo');
    process.exit(1);
  }

  for (const { name, skill } of resolved) {
    const content = readFileSync(skill.path, 'utf-8');

    // Output in Claude Code format
    console.log(`Reading: ${name}`);
    console.log(`Base directory: ${skill.baseDir}`);
    console.log('');
    console.log(content);
    console.log('');
    console.log(`Skill read: ${name}`);
  }
}
