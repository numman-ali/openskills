import chalk from 'chalk';
import { findAllSkills } from '../utils/skills.js';

/**
 * List all installed skills
 */
export function listSkills(): void {
  console.log(chalk.bold('Available Skills:\n'));

  const skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed.\n');
    console.log('Install skills:');
    console.log(`  ${chalk.cyan('openskills install anthropics/skills')}         ${chalk.dim('# Project (default)')}`);
    console.log(`  ${chalk.cyan('openskills install owner/skill --global')}     ${chalk.dim('# Global (advanced)')}`);
    return;
  }

  // Sort: project skills first, then global, alphabetically within each
  const sorted = skills.sort((a, b) => {
    if (a.location !== b.location) {
      return a.location === 'project' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Display with inline location labels
  for (const skill of sorted) {
    const locationLabel = skill.location === 'project'
      ? chalk.blue('(project)')
      : chalk.dim('(global)');

    console.log(`  ${chalk.bold(skill.name.padEnd(25))} ${locationLabel}`);
    console.log(`    ${chalk.dim(skill.description)}\n`);
  }

  // Summary
  const projectCount = skills.filter(s => s.location === 'project').length;
  const globalCount = skills.filter(s => s.location === 'global').length;

  console.log(chalk.dim(`Summary: ${projectCount} project, ${globalCount} global (${skills.length} total)`));
}
