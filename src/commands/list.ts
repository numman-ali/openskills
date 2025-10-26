import { findAllSkills } from '../utils/skills.js';

/**
 * List all installed skills
 */
export function listSkills(): void {
  console.log('Available Skills:\n');

  const skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed.\n');
    console.log('Install skills:');
    console.log('  openskills install anthropics/skills --project    # Recommended (conflict-free)');
    console.log('  openskills install owner/unique-skill             # Global (advanced)');
    return;
  }

  // Group by location
  const projectSkills = skills.filter(s => s.location === 'project');
  const globalSkills = skills.filter(s => s.location === 'global');

  if (projectSkills.length > 0) {
    console.log('.claude/skills/ (project):');
    for (const skill of projectSkills) {
      console.log(`  ${skill.name.padEnd(20)}`);
      console.log(`    ${skill.description}\n`);
    }
  }

  if (globalSkills.length > 0) {
    console.log('~/.claude/skills/ (global):');
    for (const skill of globalSkills) {
      console.log(`  ${skill.name.padEnd(20)}`);
      console.log(`    ${skill.description}\n`);
    }
  }

  console.log(`Total: ${skills.length} skill(s)`);
}
