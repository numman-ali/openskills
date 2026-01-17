import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Skill } from '../types';
import { extractYamlField, hasValidFrontmatter } from '../utils/yaml';

const CACHE_DIR = path.join(os.tmpdir(), 'agentskills-git-cache');

/**
 * Scan skills from a local directory
 */
export function scanSkillsFromDir(repoPath: string, repoUrl: string): Skill[] {
    const skills: Skill[] = [];

    if (!fs.existsSync(repoPath)) {
        return skills;
    }

    const findSkills = (dir: string) => {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === '.git') continue;

                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const skillMdPath = path.join(fullPath, 'SKILL.md');
                    if (fs.existsSync(skillMdPath)) {
                        const content = fs.readFileSync(skillMdPath, 'utf-8');
                        if (hasValidFrontmatter(content)) {
                            skills.push({
                                name: extractYamlField(content, 'name') || entry.name,
                                description: extractYamlField(content, 'description'),
                                path: path.relative(repoPath, fullPath).replace(/\\/g, '/'),
                                repoUrl: repoUrl,
                                localPath: fullPath
                            });
                        }
                    } else {
                        findSkills(fullPath);
                    }
                }
            }
        } catch (e) {
            console.error(`Error scanning dir ${dir}`, e);
        }
    };

    findSkills(repoPath);
    return skills;
}

/**
 * Get the cache path for a repo URL
 */
export function getRepoCachePath(url: string): string {
    const dirName = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return path.join(CACHE_DIR, dirName);
}
