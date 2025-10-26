import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';
import { getSkillsDir, getSearchDirs } from '../../src/utils/dirs.js';

describe('getSkillsDir', () => {
  it('should return global dir by default', () => {
    const dir = getSkillsDir();
    expect(dir).toBe(join(homedir(), '.claude/skills'));
  });

  it('should return project dir when projectLocal is true', () => {
    const dir = getSkillsDir(true);
    expect(dir).toBe(join(process.cwd(), '.claude/skills'));
  });
});

describe('getSearchDirs', () => {
  it('should return dirs in priority order', () => {
    const dirs = getSearchDirs();
    expect(dirs).toHaveLength(2);
    expect(dirs[0]).toBe(join(process.cwd(), '.claude/skills'));
    expect(dirs[1]).toBe(join(homedir(), '.claude/skills'));
  });
});
