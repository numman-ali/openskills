import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';

/**
 * Load skill to stdout (for AI agents)
 */
export function loadSkill(skillName: string): void {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    console.error('\nSearched:');
    console.error('  .claude/skills/ (project)');
    console.error('  ~/.claude/skills/ (global)');
    console.error('\nInstall skills: openskills install owner/repo');
    process.exit(1);
  }

  const content = readFileSync(skill.path, 'utf-8');

  // Output in Claude Code format
  console.log(`Loading: ${skillName}`);
  console.log(`Base directory: ${skill.baseDir}`);
  console.log('');
  console.log(content);
  console.log('');
  console.log(`Skill loaded: ${skillName}`);
}
