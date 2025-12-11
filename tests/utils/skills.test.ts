import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, symlinkSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findAllSkills, findSkill } from '../../src/utils/skills.js';
import * as dirsModule from '../../src/utils/dirs.js';

// Create unique temp directories for each test run
const testId = Math.random().toString(36).slice(2);
const testTempDir = join(tmpdir(), `openskills-test-${testId}`);
const testProjectSkillsDir = join(testTempDir, 'project', '.claude', 'skills');
const testGlobalSkillsDir = join(testTempDir, 'global', '.claude', 'skills');
const testSymlinkTargetDir = join(testTempDir, 'symlink-targets');

// Helper to create a skill directory with SKILL.md
function createSkill(baseDir: string, skillName: string, description: string = 'Test skill'): void {
  const skillDir = join(baseDir, skillName);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---
name: ${skillName}
description: ${description}
---

# ${skillName}

This is a test skill.`
  );
}

// Helper to create a symlinked skill
function createSymlinkedSkill(
  skillsDir: string,
  skillName: string,
  description: string = 'Symlinked test skill'
): void {
  // Create the actual skill in the symlink target directory
  const actualSkillDir = join(testSymlinkTargetDir, skillName);
  mkdirSync(actualSkillDir, { recursive: true });
  writeFileSync(
    join(actualSkillDir, 'SKILL.md'),
    `---
name: ${skillName}
description: ${description}
---

# ${skillName}

This is a symlinked test skill.`
  );

  // Create symlink in the skills directory
  mkdirSync(skillsDir, { recursive: true });
  symlinkSync(actualSkillDir, join(skillsDir, skillName), 'dir');
}

// Helper to create a broken symlink
function createBrokenSymlink(skillsDir: string, skillName: string): void {
  mkdirSync(skillsDir, { recursive: true });
  const nonExistentTarget = join(testTempDir, 'non-existent', skillName);
  symlinkSync(nonExistentTarget, join(skillsDir, skillName), 'dir');
}

describe('skills.ts', () => {
  beforeEach(() => {
    // Create test directories
    mkdirSync(testProjectSkillsDir, { recursive: true });
    mkdirSync(testGlobalSkillsDir, { recursive: true });
    mkdirSync(testSymlinkTargetDir, { recursive: true });

    // Mock getSearchDirs to return our test directories
    vi.spyOn(dirsModule, 'getSearchDirs').mockReturnValue([
      testProjectSkillsDir,
      testGlobalSkillsDir,
    ]);
  });

  afterEach(() => {
    // Cleanup test directories
    rmSync(testTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('findAllSkills', () => {
    it('should find regular directory skills', () => {
      createSkill(testProjectSkillsDir, 'regular-skill', 'A regular skill');

      const skills = findAllSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('regular-skill');
      expect(skills[0].description).toBe('A regular skill');
    });

    it('should find symlinked skill directories', () => {
      createSymlinkedSkill(testGlobalSkillsDir, 'symlinked-skill', 'A symlinked skill');

      const skills = findAllSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('symlinked-skill');
      expect(skills[0].description).toBe('A symlinked skill');
    });

    it('should find both regular and symlinked skills', () => {
      createSkill(testProjectSkillsDir, 'regular-skill', 'Regular');
      createSymlinkedSkill(testGlobalSkillsDir, 'symlinked-skill', 'Symlinked');

      const skills = findAllSkills();

      expect(skills).toHaveLength(2);
      const names = skills.map(s => s.name);
      expect(names).toContain('regular-skill');
      expect(names).toContain('symlinked-skill');
    });

    it('should skip broken symlinks gracefully', () => {
      createSkill(testProjectSkillsDir, 'good-skill', 'Good skill');
      createBrokenSymlink(testGlobalSkillsDir, 'broken-symlink');

      const skills = findAllSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('good-skill');
    });

    it('should deduplicate skills with same name (project takes priority)', () => {
      createSkill(testProjectSkillsDir, 'duplicate-skill', 'Project version');
      createSkill(testGlobalSkillsDir, 'duplicate-skill', 'Global version');

      const skills = findAllSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('duplicate-skill');
      expect(skills[0].description).toBe('Project version');
    });

    it('should skip directories without SKILL.md', () => {
      const noSkillDir = join(testProjectSkillsDir, 'not-a-skill');
      mkdirSync(noSkillDir, { recursive: true });
      writeFileSync(join(noSkillDir, 'README.md'), '# Not a skill');

      const skills = findAllSkills();

      expect(skills).toHaveLength(0);
    });

    it('should skip files (not directories)', () => {
      writeFileSync(join(testProjectSkillsDir, 'file.txt'), 'Just a file');
      createSkill(testProjectSkillsDir, 'actual-skill', 'Real skill');

      const skills = findAllSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('actual-skill');
    });

    it('should handle empty skills directories', () => {
      const skills = findAllSkills();
      expect(skills).toHaveLength(0);
    });

    it('should handle non-existent directories gracefully', () => {
      vi.spyOn(dirsModule, 'getSearchDirs').mockReturnValue([
        '/non/existent/path',
        testProjectSkillsDir,
      ]);
      createSkill(testProjectSkillsDir, 'skill', 'Test');

      const skills = findAllSkills();

      expect(skills).toHaveLength(1);
    });
  });

  describe('findSkill', () => {
    it('should find a skill by name', () => {
      createSkill(testProjectSkillsDir, 'my-skill', 'My skill description');

      const skill = findSkill('my-skill');

      expect(skill).not.toBeNull();
      expect(skill?.path).toContain('my-skill/SKILL.md');
      expect(skill?.baseDir).toContain('my-skill');
    });

    it('should find symlinked skills by name', () => {
      createSymlinkedSkill(testGlobalSkillsDir, 'linked-skill', 'Linked description');

      const skill = findSkill('linked-skill');

      expect(skill).not.toBeNull();
      expect(skill?.path).toContain('linked-skill/SKILL.md');
    });

    it('should return null for non-existent skill', () => {
      const skill = findSkill('non-existent');
      expect(skill).toBeNull();
    });

    it('should return project skill over global with same name', () => {
      createSkill(testProjectSkillsDir, 'shared-skill', 'Project');
      createSkill(testGlobalSkillsDir, 'shared-skill', 'Global');

      const skill = findSkill('shared-skill');

      expect(skill).not.toBeNull();
      expect(skill?.source).toBe(testProjectSkillsDir);
    });
  });
});
