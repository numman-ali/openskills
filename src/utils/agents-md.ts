import type { Skill } from '../types.js';

/**
 * Parse skill names currently in AGENTS.md
 */
export function parseCurrentSkills(content: string): string[] {
  const skillNames: string[] = [];

  // Match <skill><name>skill-name</name>...</skill>
  const skillRegex = /<skill>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/skill>/g;

  let match;
  while ((match = skillRegex.exec(content)) !== null) {
    skillNames.push(match[1].trim());
  }

  return skillNames;
}

/**
 * Generate skills XML section for AGENTS.md
 */
export function generateSkillsXml(skills: Skill[]): string {
  const skillTags = skills
    .map(
      (s) => `<skill>
<name>${s.name}</name>
<description>${s.description}</description>
<location>${s.location}</location>
</skill>`
    )
    .join('\n\n');

  return `<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

${skillTags}

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>`;
}

/**
 * Replace or add skills section in AGENTS.md
 */
export function replaceSkillsSection(content: string, newSection: string): string {
  const startMarker = '<skills_system';
  const endMarker = '</skills_system>';

  // Check for XML markers
  if (content.includes(startMarker)) {
    const regex = /<skills_system[^>]*>[\s\S]*?<\/skills_system>/;
    return content.replace(regex, newSection);
  }

  // Fallback to HTML comments
  const htmlStartMarker = '<!-- SKILLS_TABLE_START -->';
  const htmlEndMarker = '<!-- SKILLS_TABLE_END -->';

  if (content.includes(htmlStartMarker)) {
    // Extract content without outer XML wrapper
    const innerContent = newSection.replace(/<skills_system[^>]*>|<\/skills_system>/g, '');
    const regex = new RegExp(
      `${htmlStartMarker}[\\s\\S]*?${htmlEndMarker}`,
      'g'
    );
    return content.replace(regex, `${htmlStartMarker}\n${innerContent}\n${htmlEndMarker}`);
  }

  // No markers found - append to end of file
  return content.trimEnd() + '\n\n' + newSection + '\n';
}

/**
 * Remove skills section from AGENTS.md
 */
export function removeSkillsSection(content: string): string {
  const startMarker = '<skills_system';
  const endMarker = '</skills_system>';

  // Check for XML markers
  if (content.includes(startMarker)) {
    const regex = /<skills_system[^>]*>[\s\S]*?<\/skills_system>/;
    return content.replace(regex, '<!-- Skills section removed -->');
  }

  // Fallback to HTML comments
  const htmlStartMarker = '<!-- SKILLS_TABLE_START -->';
  const htmlEndMarker = '<!-- SKILLS_TABLE_END -->';

  if (content.includes(htmlStartMarker)) {
    const regex = new RegExp(
      `${htmlStartMarker}[\\s\\S]*?${htmlEndMarker}`,
      'g'
    );
    return content.replace(regex, `${htmlStartMarker}\n<!-- Skills section removed -->\n${htmlEndMarker}`);
  }

  // No markers found - nothing to remove
  return content;
}
