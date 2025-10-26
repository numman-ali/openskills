import { existsSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { checkbox } from '@inquirer/prompts';
import { findAllSkills } from '../utils/skills.js';
import { generateSkillsXml, replaceSkillsSection } from '../utils/agents-md.js';
import type { Skill } from '../types.js';

export interface SyncOptions {
  yes?: boolean;
}

/**
 * Sync installed skills to AGENTS.md
 */
export async function syncAgentsMd(options: SyncOptions = {}): Promise<void> {
  if (!existsSync('AGENTS.md')) {
    console.log(chalk.yellow('No AGENTS.md to update'));
    return;
  }

  let skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed. Install skills first:');
    console.log(`  ${chalk.cyan('openskills install anthropics/skills --project')}`);
    return;
  }

  // Interactive mode by default (unless -y flag)
  if (!options.yes) {
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
      description: skill.description.slice(0, 70),
      checked: skill.location === 'project', // Check project skills by default
    }));

    const selected = await checkbox({
      message: 'Select skills to sync to AGENTS.md',
      choices,
      pageSize: 15,
    });

    if (selected.length === 0) {
      console.log(chalk.yellow('No skills selected. AGENTS.md not modified.'));
      return;
    }

    // Filter skills to selected ones
    skills = skills.filter((s) => selected.includes(s.name));
  }

  const xml = generateSkillsXml(skills);
  const content = readFileSync('AGENTS.md', 'utf-8');
  const updated = replaceSkillsSection(content, xml);

  writeFileSync('AGENTS.md', updated);

  const hadMarkers =
    content.includes('<skills_system') || content.includes('<!-- SKILLS_TABLE_START -->');

  if (hadMarkers) {
    console.log(chalk.green(`✅ Synced ${skills.length} skill(s) to AGENTS.md`));
  } else {
    console.log(chalk.green(`✅ Added skills section to AGENTS.md (${skills.length} skill(s))`));
  }
}
