import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { SkillJson, SkillJsonEntry } from '../types.js';

export const SKILL_JSON_FILENAME = 'skill.json';

/**
 * Read and parse a skill.json file from a directory.
 * Returns null if the file does not exist or is invalid JSON.
 */
export function readSkillJson(repoDir: string): SkillJson | null {
  const skillJsonPath = join(repoDir, SKILL_JSON_FILENAME);
  if (!existsSync(skillJsonPath)) return null;

  try {
    const raw = readFileSync(skillJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    if (!isValidSkillJson(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Type guard: ensure the parsed JSON conforms to the SkillJson shape.
 */
function isValidSkillJson(value: unknown): value is SkillJson {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj['skills'])) return false;

  for (const entry of obj['skills'] as unknown[]) {
    if (!isValidSkillJsonEntry(entry)) return false;
  }

  return true;
}

function isValidSkillJsonEntry(value: unknown): value is SkillJsonEntry {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['name'] === 'string' && typeof obj['path'] === 'string';
}

/**
 * Resolve a skill entry's path relative to the repo directory.
 * Normalises "./foo" → "<repoDir>/foo".
 */
export function resolveSkillEntryPath(repoDir: string, entryPath: string): string {
  // If path starts with ./ or ../ treat it as relative to repoDir
  if (entryPath.startsWith('./') || entryPath.startsWith('../')) {
    return resolve(repoDir, entryPath);
  }
  // Otherwise join directly (handles bare names like "pdf")
  return join(repoDir, entryPath);
}

/**
 * Extract a flat list of skill entries from a skill.json, resolving their
 * absolute paths. Entries whose resolved paths do not exist on disk are
 * silently excluded (the directory may not be present in a shallow clone, etc.).
 */
export function getResolvedSkillEntries(
  repoDir: string,
  skillJson: SkillJson
): Array<SkillJsonEntry & { resolvedPath: string }> {
  return skillJson.skills
    .map((entry) => ({
      ...entry,
      resolvedPath: resolveSkillEntryPath(repoDir, entry.path),
    }))
    .filter((entry) => existsSync(entry.resolvedPath));
}
