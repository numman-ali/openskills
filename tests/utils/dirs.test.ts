import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';
import { getSkillsDir, getSearchDirs } from '../../src/utils/dirs.js';

describe('getSkillsDir', () => {
  it('should return global .claude dir by default', () => {
    const dir = getSkillsDir();
    expect(dir).toBe(join(homedir(), '.claude/skills'));
  });

  it('should return project .claude dir when projectLocal is true', () => {
    const dir = getSkillsDir(true);
    expect(dir).toBe(join(process.cwd(), '.claude/skills'));
  });

  it('should return global .agent dir when universal is true', () => {
    const dir = getSkillsDir(false, true);
    expect(dir).toBe(join(homedir(), '.agent/skills'));
  });

  it('should return project .agent dir when both projectLocal and universal are true', () => {
    const dir = getSkillsDir(true, true);
    expect(dir).toBe(join(process.cwd(), '.agent/skills'));
  });
});

describe('getSearchDirs', () => {
  it('should return all 4 dirs in priority order', () => {
    const dirs = getSearchDirs();
    expect(dirs).toHaveLength(4);
    expect(dirs[0]).toBe(join(process.cwd(), '.agent/skills'));   // 1. Project universal
    expect(dirs[1]).toBe(join(homedir(), '.agent/skills'));        // 2. Global universal
    expect(dirs[2]).toBe(join(process.cwd(), '.claude/skills'));  // 3. Project claude
    expect(dirs[3]).toBe(join(homedir(), '.claude/skills'));       // 4. Global claude
  });
});
