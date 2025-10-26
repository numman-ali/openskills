import { existsSync, readFileSync, writeFileSync } from 'fs';
import { checkbox } from '@inquirer/prompts';
import { findAllSkills } from '../utils/skills.js';
import { generateSkillsXml, replaceSkillsSection } from '../utils/agents-md.js';
import type { Skill } from '../types.js';

export interface SyncOptions {
  interactive?: boolean;
}

/**
 * Sync installed skills to AGENTS.md
 */
export async function syncAgentsMd(options: SyncOptions = {}): Promise<void> {
  if (!existsSync('AGENTS.md')) {
    console.log('No AGENTS.md to update');
    return;
  }

  let skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed. Install skills first:');
    console.log('  openskills install anthropics/skills --project');
    return;
  }

  // Interactive mode: let user select skills
  if (options.interactive) {
    const choices = skills.map((skill) => ({
      name: `${skill.name} (${skill.location})`,
      value: skill.name,
      checked: true,
    }));

    const selected = await checkbox({
      message: 'Select skills to sync to AGENTS.md',
      choices,
    });

    if (selected.length === 0) {
      console.log('No skills selected. AGENTS.md not modified.');
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
    console.log(`✅ Synced ${skills.length} skill(s) to AGENTS.md`);
  } else {
    console.log(`✅ Added skills section to AGENTS.md (${skills.length} skill(s))`);
  }
}
