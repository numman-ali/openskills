import { rmSync } from 'fs';
import chalk from 'chalk';
import { checkbox } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import { findAllSkills, findSkill } from '../utils/skills.js';

/**
 * Interactively manage (remove) installed skills
 */
export async function manageSkills(): Promise<void> {
  const skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed.');
    return;
  }

  try {
    // Sort: project first
    const sorted = skills.sort((a, b) => {
      if (a.location !== b.location) {
        return a.location === 'project' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const choices = sorted.map((skill) => ({
      name: `${chalk.bold(skill.name.padEnd(25))} ${skill.location === 'project' ? chalk.blue('(project)') : chalk.dim('(global)')}`,
      value: skill.name,
      checked: false, // Nothing checked by default
    }));

    const toRemove = await checkbox({
      message: 'Select skills to remove',
      choices,
      pageSize: 15,
    });

    if (toRemove.length === 0) {
      console.log(chalk.yellow('No skills selected for removal.'));
      return;
    }

    // Remove selected skills
    for (const skillName of toRemove) {
      const skill = findSkill(skillName);
      if (skill) {
        rmSync(skill.baseDir, { recursive: true, force: true });
        const location = skill.source.includes(process.cwd()) ? 'project' : 'global';
        console.log(chalk.green(`✅ Removed: ${skillName} (${location})`));
      }
    }

    console.log(chalk.green(`\n✅ Removed ${toRemove.length} skill(s)`));
  } catch (error) {
    if (error instanceof ExitPromptError) {
      console.log(chalk.yellow('\n\nCancelled by user'));
      process.exit(0);
    }
    throw error;
  }
}
