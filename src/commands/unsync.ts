import { existsSync, readFileSync, writeFileSync } from 'fs';
import { removeSkillsSection } from '../utils/agents-md.js';

/**
 * Remove skills section from AGENTS.md
 */
export function unsyncAgentsMd(): void {
  if (!existsSync('AGENTS.md')) {
    console.log('No AGENTS.md to update');
    return;
  }

  try {
    const content = readFileSync('AGENTS.md', 'utf-8');
    const updated = removeSkillsSection(content);

    writeFileSync('AGENTS.md', updated);

    console.log('✅ Removed skills section from AGENTS.md');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}
