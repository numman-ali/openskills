import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, symlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findAllSkills, findSkill } from '../../src/utils/skills.js';
import * as dirsModule from '../../src/utils/dirs.js';

// Temporary directory for test skills
const testTempDir = join(tmpdir(), 'openskills-test-' + Math.random().toString(36).slice(2));
const testProjectDir = join(process.cwd(), '.test-skills-project');
const testGlobalDir = join(testTempDir, 'global-skills');

// Helper to create a skill directory structure
function createSkill(baseDir: string, skillName: string, description: string = 'Test skill') {
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

// Helper to create symlinked skill
function createSymlinkedSkill(baseDir: string, skillName: string, targetDir: string, description: string = 'Test skill') {
  mkdirSync(baseDir, { recursive: true });
  mkdirSync(targetDir, { recursive: true });
  createSkill(targetDir, skillName, description);
  symlinkSync(join(targetDir, skillName), join(baseDir, skillName), 'dir');
}

describe('findAllSkills', () => {
  let getSearchDirsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create test directories
    mkdirSync(testProjectDir, { recursive: true });
    mkdirSync(testGlobalDir, { recursive: true });

    // Mock getSearchDirs to return test directories
    getSearchDirsSpy = vi.spyOn(dirsModule, 'getSearchDirs').mockReturnValue([
      testProjectDir,
      testGlobalDir,
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(testProjectDir, { recursive: true, force: true });
    rmSync(testTempDir, { recursive: true, force: true });
  });

  it('should find skills in project directory', () => {
    createSkill(testProjectDir, 'skill-one', 'First test skill');
    createSkill(testProjectDir, 'skill-two', 'Second test skill');

    const skills = findAllSkills();

    expect(skills).toHaveLength(2);
    expect(skills.find(s => s.name === 'skill-one')).toBeDefined();
    expect(skills.find(s => s.name === 'skill-two')).toBeDefined();
  });

  it('should find skills in global directory', () => {
    createSkill(testGlobalDir, 'global-skill', 'Global test skill');

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('global-skill');
    expect(skills[0].location).toBe('global');
  });

  it('should find skills across multiple directories', () => {
    createSkill(testProjectDir, 'project-skill', 'Project skill');
    createSkill(testGlobalDir, 'global-skill', 'Global skill');

    const skills = findAllSkills();

    expect(skills).toHaveLength(2);
    expect(skills.some(s => s.name === 'project-skill')).toBe(true);
    expect(skills.some(s => s.name === 'global-skill')).toBe(true);
  });

  it('should prioritize project skills over global when names conflict', () => {
    createSkill(testProjectDir, 'shared-skill', 'Project version');
    createSkill(testGlobalDir, 'shared-skill', 'Global version');

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('shared-skill');
    expect(skills[0].description).toBe('Project version');
    expect(skills[0].location).toBe('project');
  });

  it('should mark skills as project or global correctly', () => {
    createSkill(testProjectDir, 'project-skill');
    createSkill(testGlobalDir, 'global-skill');

    const skills = findAllSkills();

    const projectSkill = skills.find(s => s.name === 'project-skill');
    const globalSkill = skills.find(s => s.name === 'global-skill');

    expect(projectSkill?.location).toBe('project');
    expect(globalSkill?.location).toBe('global');
  });

  it('should extract skill description from YAML frontmatter', () => {
    createSkill(testProjectDir, 'documented-skill', 'My awesome skill');

    const skills = findAllSkills();

    expect(skills[0].description).toBe('My awesome skill');
  });

  it('should set correct skill paths', () => {
    createSkill(testProjectDir, 'test-skill');

    const skills = findAllSkills();

    expect(skills[0].path).toBe(join(testProjectDir, 'test-skill'));
  });

  it('should ignore directories without SKILL.md file', () => {
    mkdirSync(join(testProjectDir, 'not-a-skill'));
    writeFileSync(join(testProjectDir, 'not-a-skill', 'README.md'), 'Not a skill');
    createSkill(testProjectDir, 'real-skill');

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('real-skill');
  });

  it('should handle non-existent directories gracefully', () => {
    getSearchDirsSpy.mockReturnValue([
      join(testTempDir, 'non-existent-1'),
      join(testTempDir, 'non-existent-2'),
    ]);

    const skills = findAllSkills();

    expect(skills).toHaveLength(0);
  });

  it('should find symlinked skill directories', () => {
    const externalSkillDir = join(testTempDir, 'external-skills');
    createSymlinkedSkill(testProjectDir, 'symlinked-skill', externalSkillDir);

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('symlinked-skill');
    expect(skills[0].path).toBe(join(testProjectDir, 'symlinked-skill'));
  });

  it('should find multiple symlinked skills', () => {
    const externalDir1 = join(testTempDir, 'external-1');
    const externalDir2 = join(testTempDir, 'external-2');

    createSymlinkedSkill(testProjectDir, 'symlink-one', externalDir1);
    createSymlinkedSkill(testProjectDir, 'symlink-two', externalDir2);

    const skills = findAllSkills();

    expect(skills).toHaveLength(2);
    expect(skills.some(s => s.name === 'symlink-one')).toBe(true);
    expect(skills.some(s => s.name === 'symlink-two')).toBe(true);
  });

  it('should handle symlinked skill in global directory', () => {
    const externalSkillDir = join(testTempDir, 'external-global-skills');
    createSymlinkedSkill(testGlobalDir, 'global-symlink', externalSkillDir);

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('global-symlink');
    expect(skills[0].location).toBe('global');
  });

  it('should prioritize symlinked project skill over symlinked global skill', () => {
    const externalProject = join(testTempDir, 'external-project');
    const externalGlobal = join(testTempDir, 'external-global');

    createSymlinkedSkill(testProjectDir, 'shared-symlink', externalProject);
    createSymlinkedSkill(testGlobalDir, 'shared-symlink', externalGlobal);

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('shared-symlink');
    expect(skills[0].location).toBe('project');
  });

  it('should mix regular and symlinked skill directories', () => {
    createSkill(testProjectDir, 'regular-skill', 'Regular skill');

    const externalSkillDir = join(testTempDir, 'external-skills');
    createSymlinkedSkill(testProjectDir, 'symlinked-skill', externalSkillDir);

    createSkill(testGlobalDir, 'global-skill', 'Global skill');

    const skills = findAllSkills();

    expect(skills).toHaveLength(3);
    expect(skills.some(s => s.name === 'regular-skill')).toBe(true);
    expect(skills.some(s => s.name === 'symlinked-skill')).toBe(true);
    expect(skills.some(s => s.name === 'global-skill')).toBe(true);
  });

  it('should not find duplicate symlinked skills across directories', () => {
    const externalSkillDir = join(testTempDir, 'external-skills');
    createSymlinkedSkill(testProjectDir, 'duplicate-symlink', externalSkillDir);
    createSymlinkedSkill(testGlobalDir, 'duplicate-symlink', externalSkillDir);

    const skills = findAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('duplicate-symlink');
    expect(skills[0].location).toBe('project');
  });

  it('should read SKILL.md content from symlinked directories correctly', () => {
    const externalSkillDir = join(testTempDir, 'external-skills');
    createSymlinkedSkill(testProjectDir, 'symlink-with-description', externalSkillDir, 'Symlink description');

    const skills = findAllSkills();

    expect(skills[0].description).toBe('Symlink description');
  });
});

describe('findSkill', () => {
  beforeEach(() => {
    mkdirSync(testProjectDir, { recursive: true });
    mkdirSync(testGlobalDir, { recursive: true });

    vi.spyOn(dirsModule, 'getSearchDirs').mockReturnValue([
      testProjectDir,
      testGlobalDir,
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(testProjectDir, { recursive: true, force: true });
    rmSync(testTempDir, { recursive: true, force: true });
  });

  it('should find a specific skill by name', () => {
    createSkill(testProjectDir, 'target-skill');

    const result = findSkill('target-skill');

    expect(result).not.toBeNull();
    expect(result?.path).toBe(join(testProjectDir, 'target-skill', 'SKILL.md'));
  });

  it('should find symlinked skill by name', () => {
    const externalSkillDir = join(testTempDir, 'external-skills');
    createSymlinkedSkill(testProjectDir, 'symlinked-target', externalSkillDir);

    const result = findSkill('symlinked-target');

    expect(result).not.toBeNull();
    expect(result?.baseDir).toBe(join(testProjectDir, 'symlinked-target'));
  });

  it('should return null when skill not found', () => {
    const result = findSkill('non-existent-skill');

    expect(result).toBeNull();
  });

  it('should prioritize project skill over global when finding by name', () => {
    createSkill(testProjectDir, 'shared-skill', 'Project');
    createSkill(testGlobalDir, 'shared-skill', 'Global');

    const result = findSkill('shared-skill');

    expect(result?.source).toBe(testProjectDir);
  });
});
