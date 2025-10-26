import { rmSync } from 'fs';
import { homedir } from 'os';
import { findSkill } from '../utils/skills.js';

/**
 * Remove installed skill
 */
export function removeSkill(skillName: string): void {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    process.exit(1);
  }

  rmSync(skill.baseDir, { recursive: true, force: true });

  const location = skill.source.includes(homedir()) ? 'global' : 'project';
  console.log(`✅ Removed: ${skillName}`);
  console.log(`   From: ${location} (${skill.source})`);
}
