import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Compute a hash of a single file's content
 */
function computeFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Compute the hash of the SKILL.md file in the directory
 * Only uses SKILL.md for comparison as requested
 */
export function computeSkillHash(dirPath: string): string {
    const skillMdPath = path.join(dirPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        return '';
    }
    return computeFileHash(skillMdPath);
}

/**
 * Compare two skill directories based on their SKILL.md content
 * @param dir1 First directory path
 * @param dir2 Second directory path
 * @returns true if SKILL.md files are identical, false otherwise
 */
export function compareSkillDirectories(dir1: string, dir2: string): boolean {
    if (!fs.existsSync(dir1) || !fs.existsSync(dir2)) {
        return false;
    }

    const hash1 = computeSkillHash(dir1);
    const hash2 = computeSkillHash(dir2);

    return hash1 === hash2;
}

/**
 * Cache for skill hashes to avoid recomputing
 */
const hashCache = new Map<string, { hash: string; mtime: number }>();

/**
 * Get cached skill hash (of SKILL.md), recomputing if file has been modified
 */
export function getCachedSkillHash(dirPath: string): string {
    const skillMdPath = path.join(dirPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        return '';
    }

    try {
        const stats = fs.statSync(skillMdPath);
        const mtime = stats.mtimeMs;
        const cached = hashCache.get(dirPath);

        if (cached && cached.mtime === mtime) {
            return cached.hash;
        }

        const hash = computeSkillHash(dirPath);
        hashCache.set(dirPath, { hash, mtime });
        return hash;
    } catch {
        return '';
    }
}

/**
 * Clear the hash cache (useful after installations/deletions)
 */
export function clearHashCache(): void {
    hashCache.clear();
}
