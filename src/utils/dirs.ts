import { join } from 'path';
import { homedir } from 'os';

/**
 * Get skills directory path
 */
export function getSkillsDir(projectLocal: boolean = false, universal: boolean = false): string {
  const folder = universal ? '.agent/skills' : '.claude/skills';
  return projectLocal
    ? join(process.cwd(), folder)
    : join(homedir(), folder);
}

/**
 * Get all searchable skill directories in priority order
 * Priority: project .agent > global .agent > project .claude > global .claude
 */
export function getSearchDirs(): string[] {
  return [
    join(process.cwd(), '.agent/skills'),   // 1. Project universal (.agent)
    join(homedir(), '.agent/skills'),        // 2. Global universal (.agent)
    join(process.cwd(), '.claude/skills'),  // 3. Project claude
    join(homedir(), '.claude/skills'),       // 4. Global claude
  ];
}
