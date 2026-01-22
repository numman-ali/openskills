import { homedir } from 'os';
import { findSkill } from '../utils/skills.js';
import { safeDelete } from '../utils/trash.js';
import type { DeleteOptions } from '../types.js';

/**
 * Remove installed skill
 */
export async function removeSkill(skillName: string, options: DeleteOptions = {}): Promise<void> {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    process.exit(1);
  }

  // Determine if permanent deletion based on options
  const isPermanent = options.permanent || false;

  // Show warning for permanent deletion
  if (isPermanent) {
    console.log(`⚠️ DANGER: Permanently deleting ${skillName}`);
  }

  // Perform the deletion
  const deleted = await safeDelete([skill.baseDir], isPermanent);

  if (deleted) {
    const location = skill.source.includes(homedir()) ? 'global' : 'project';
    console.log(`   From: ${location} (${skill.source})`);
  }
}
