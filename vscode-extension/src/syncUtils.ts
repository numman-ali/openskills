import * as fs from 'fs';
import * as path from 'path';

interface InstalledSkill {
    name: string;
    description: string;
    location: 'project' | 'global';
    path: string;
}

function extractYamlField(content: string, field: string): string {
    const match = content.match(new RegExp(`^${field}:\\s*(.+?)$`, 'm'));
    return match ? match[1].trim() : '';
}

export function findInstalledSkills(workspaceRoot: string): InstalledSkill[] {
    const skills: InstalledSkill[] = [];
    const dirs = [
        path.join(workspaceRoot, '.agent', 'skills'),  // Universal (priority)
        path.join(workspaceRoot, '.claude', 'skills')  // Claude-specific (fallback)
    ];

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() || entry.isSymbolicLink()) {
                const skillPath = path.join(dir, entry.name, 'SKILL.md');
                if (fs.existsSync(skillPath)) {
                    const content = fs.readFileSync(skillPath, 'utf-8');
                    skills.push({
                        name: entry.name,
                        description: extractYamlField(content, 'description'),
                        location: 'project',
                        path: path.join(dir, entry.name)
                    });
                }
            }
        }
    }

    return skills;
}

export function generateSkillsXml(skills: InstalledSkill[]): string {
    const skillTags = skills
        .map(s => `<skill>
<name>${s.name}</name>
<description>${s.description}</description>
<location>${s.location}</location>
</skill>`)
        .join('\n\n');

    return `<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("npx openskills read <skill-name>")
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

export function replaceSkillsSection(content: string, newSection: string): string {
    const startMarker = '<skills_system';

    if (content.includes(startMarker)) {
        const regex = /<skills_system[^>]*>[\s\S]*?<\/skills_system>/;
        return content.replace(regex, newSection);
    }

    const htmlStartMarker = '<!-- SKILLS_TABLE_START -->';
    const htmlEndMarker = '<!-- SKILLS_TABLE_END -->';

    if (content.includes(htmlStartMarker)) {
        const innerContent = newSection.replace(/<skills_system[^>]*>|<\/skills_system>/g, '');
        const regex = new RegExp(`${htmlStartMarker}[\\s\\S]*?${htmlEndMarker}`, 'g');
        return content.replace(regex, `${htmlStartMarker}\n${innerContent}\n${htmlEndMarker}`);
    }

    return content.trimEnd() + '\n\n' + newSection + '\n';
}

export function syncToAgentsMd(workspaceRoot: string): { success: boolean; message: string; count: number } {
    const outputPath = path.join(workspaceRoot, 'AGENTS.md');

    // Create file if it doesn't exist
    if (!fs.existsSync(outputPath)) {
        fs.writeFileSync(outputPath, '# AGENTS\n\n');
    }

    const skills = findInstalledSkills(workspaceRoot);

    if (skills.length === 0) {
        return { success: true, message: 'No skills installed.', count: 0 };
    }

    const xml = generateSkillsXml(skills);
    const content = fs.readFileSync(outputPath, 'utf-8');
    const updated = replaceSkillsSection(content, xml);

    fs.writeFileSync(outputPath, updated);

    return { success: true, message: `Synced ${skills.length} skill(s) to AGENTS.md`, count: skills.length };
}
