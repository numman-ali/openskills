import * as fs from 'fs';
import * as path from 'path';
import {
    extractYamlField,
    generateSkillsXml as cliGenerateSkillsXml,
    replaceSkillsSection,
    getIdeConfig,
    type Skill,
    type IdeConfig
} from 'openskills';

interface InstalledSkill extends Skill {
    path: string;
}

/**
 * Find all installed skills in workspace (extension-specific version)
 * Uses workspace root parameter instead of process.cwd()
 */
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

// Re-export from openskills
export { replaceSkillsSection };

/**
 * Generate skills XML (wrapper to ensure correct type)
 */
export function generateSkillsXml(skills: InstalledSkill[]): string {
    return cliGenerateSkillsXml(skills);
}

/**
 * Sync installed skills to AGENTS.md
 */
export function syncToAgentsMd(workspaceRoot: string, ideName?: string): { success: boolean; message: string; count: number } {
    const config = getIdeConfig(ideName || 'vscode');
    const outputPath = path.join(workspaceRoot, config.rulesFile);

    // Create file if it doesn't exist
    if (!fs.existsSync(outputPath)) {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, config.initialContent);
    }

    const skills = findInstalledSkills(workspaceRoot);

    if (skills.length === 0) {
        return { success: true, message: 'No skills installed.', count: 0 };
    }

    const xml = generateSkillsXml(skills);
    const content = fs.readFileSync(outputPath, 'utf-8');
    const updated = replaceSkillsSection(content, xml);

    fs.writeFileSync(outputPath, updated);

    return { success: true, message: `Synced ${skills.length} skill(s) to ${path.basename(outputPath)}`, count: skills.length };
}
