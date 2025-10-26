import { existsSync, readFileSync, writeFileSync } from 'fs';
import { findAllSkills } from '../utils/skills.js';
import { generateSkillsXml, replaceSkillsSection } from '../utils/agents-md.js';

/**
 * Sync installed skills to AGENTS.md
 */
export function syncAgentsMd(): void {
  if (!existsSync('AGENTS.md')) {
    console.log('No AGENTS.md to update');
    return;
  }

  const skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed. Install skills first:');
    console.log('  openskills install anthropics/skills');
    return;
  }

  const xml = generateSkillsXml(skills);

  try {
    const content = readFileSync('AGENTS.md', 'utf-8');
    const updated = replaceSkillsSection(content, xml);

    writeFileSync('AGENTS.md', updated);

    console.log(`✅ Synced ${skills.length} skill(s) to AGENTS.md`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error('\nAdd markers to AGENTS.md:');
      console.error('  <skills_system priority="1">');
      console.error('  <!-- SKILLS_TABLE_START -->');
      console.error('  <!-- SKILLS_TABLE_END -->');
      console.error('  </skills_system>');
    }
    process.exit(1);
  }
}
