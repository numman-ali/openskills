import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getSearchDirs } from './dirs.js';
import { extractYamlField } from './yaml.js';
import type { Skill, SkillLocation } from '../types.js';

/**
 * Find all installed skills across directories
 */
export function findAllSkills(): Skill[] {
  const skills: Skill[] = [];
  const seen = new Set<string>();
  const dirs = getSearchDirs();

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Deduplicate: only add if we haven't seen this skill name yet
        if (seen.has(entry.name)) continue;

        const skillPath = join(dir, entry.name, 'SKILL.md');
        if (existsSync(skillPath)) {
          const content = readFileSync(skillPath, 'utf-8');
          const isProjectLocal = dir.includes(process.cwd());

          skills.push({
            name: entry.name,
            description: extractYamlField(content, 'description'),
            location: isProjectLocal ? 'project' : 'global',
            path: join(dir, entry.name),
          });

          seen.add(entry.name);
        }
      }
    }
  }

  return skills;
}

/**
 * Find specific skill by name
 */
export function findSkill(skillName: string): SkillLocation | null {
  const dirs = getSearchDirs();

  for (const dir of dirs) {
    const skillPath = join(dir, skillName, 'SKILL.md');
    if (existsSync(skillPath)) {
      return {
        path: skillPath,
        baseDir: join(dir, skillName),
        source: dir,
      };
    }
  }

  return null;
}
