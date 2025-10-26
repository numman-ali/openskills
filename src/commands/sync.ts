import { existsSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { checkbox } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import { findAllSkills } from '../utils/skills.js';
import { generateSkillsXml, replaceSkillsSection, parseCurrentSkills, removeSkillsSection } from '../utils/agents-md.js';
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
    try {
      // Parse what's currently in AGENTS.md
      const content = readFileSync('AGENTS.md', 'utf-8');
      const currentSkills = parseCurrentSkills(content);

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
        // Pre-select if currently in AGENTS.md, otherwise default to project skills
        checked: currentSkills.includes(skill.name) || (currentSkills.length === 0 && skill.location === 'project'),
      }));

      const selected = await checkbox({
        message: 'Select skills to sync to AGENTS.md',
        choices,
        pageSize: 15,
      });

      if (selected.length === 0) {
        // User unchecked everything - remove skills section
        const content = readFileSync('AGENTS.md', 'utf-8');
        const updated = removeSkillsSection(content);
        writeFileSync('AGENTS.md', updated);
        console.log(chalk.green('✅ Removed all skills from AGENTS.md'));
        return;
      }

      // Filter skills to selected ones
      skills = skills.filter((s) => selected.includes(s.name));
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\n\nCancelled by user'));
        process.exit(0);
      }
      throw error;
    }
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
