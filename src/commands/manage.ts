import chalk from 'chalk';
import { checkbox } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import { findAllSkills, findSkill } from '../utils/skills.js';
import { safeDelete } from '../utils/trash.js';
import type { Skill, DeleteOptions } from '../types.js';

/**
 * Interactively manage (remove) installed skills
 */
export async function manageSkills(options: DeleteOptions = {}): Promise<void> {
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

    // Interactive mode - select skills to manage
    const choices = sorted.map((skill) => ({
      name: `${chalk.bold(skill.name.padEnd(25))} ${skill.location === 'project' ? chalk.blue('(project)') : chalk.dim('(global)')}`,
      value: skill.name,
      checked: false, // Nothing checked by default
    }));

    const selectedSkillNames = await checkbox({
      message: 'Select skills to manage',
      choices,
      pageSize: 15,
    });

    if (selectedSkillNames.length === 0) {
      console.log('No skills selected for management.');
      return;
    }

    // Determine deletion mode based on --force flag
    // Always use trash by default, only use permanent deletion with --force
    const isPermanent = options.permanent || false;

    // Process each selected skill
    let successCount = 0;

    for (const skillName of selectedSkillNames) {
      const skill = findSkill(skillName);
      if (skill) {
        const deleted = await safeDelete([skill.baseDir], isPermanent);
        if (deleted) {
          successCount++;
        }
      }
    }

    // Report results
    const action = isPermanent ? 'permanently removed' : 'moved to trash';
    console.log(`\n✅ Successfully ${action}: ${successCount} skill(s)`);
  } catch (error) {
    if (error instanceof ExitPromptError) {
      console.log('\n\nCancelled by user');
      process.exit(0);
    }
    throw error;
  }
}

