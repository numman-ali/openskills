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
  const content = readFileSync('AGENTS.md', 'utf-8');
  const updated = replaceSkillsSection(content, xml);

  writeFileSync('AGENTS.md', updated);

  const hadMarkers = content.includes('<skills_system') || content.includes('<!-- SKILLS_TABLE_START -->');

  if (hadMarkers) {
    console.log(`✅ Synced ${skills.length} skill(s) to AGENTS.md`);
  } else {
    console.log(`✅ Added skills section to AGENTS.md (${skills.length} skill(s))`);
  }
}
