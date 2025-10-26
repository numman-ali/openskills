import { join } from 'path';
import { homedir } from 'os';

/**
 * Get skills directory path
 */
export function getSkillsDir(projectLocal: boolean = false): string {
  return projectLocal
    ? join(process.cwd(), '.claude/skills')
    : join(homedir(), '.claude/skills');
}

/**
 * Get all searchable skill directories in priority order
 */
export function getSearchDirs(): string[] {
  return [
    join(process.cwd(), '.claude/skills'),  // Project-local first
    join(homedir(), '.claude/skills'),       // Global second
  ];
}
