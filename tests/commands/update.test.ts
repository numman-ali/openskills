import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { updateSkills } from '../../src/commands/update.js';
import { writeSkillMetadata } from '../../src/utils/skill-metadata.js';

describe('updateSkills', () => {
  const originalCwd = process.cwd();
  const originalHome = process.env.HOME;
  let tempRoot: string;
  let projectDir: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'openskills-update-test-'));
    projectDir = join(tempRoot, 'project');
    mkdirSync(projectDir, { recursive: true });
    process.chdir(projectDir);

    process.env.HOME = join(tempRoot, 'home');
    mkdirSync(process.env.HOME, { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalHome) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('updates a local skill from recorded source', async () => {
    const sourceDir = join(tempRoot, 'source-skill');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      join(sourceDir, 'SKILL.md'),
      "---\nname: demo\ndescription: v2\n---\n\n# Demo\nv2\n"
    );

    const targetDir = join(projectDir, '.claude/skills/demo');
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(
      join(targetDir, 'SKILL.md'),
      "---\nname: demo\ndescription: v1\n---\n\n# Demo\nv1\n"
    );

    writeSkillMetadata(targetDir, {
      source: './source-skill',
      sourceType: 'local',
      localPath: sourceDir,
      installedAt: '2026-01-01T00:00:00.000Z',
    });

    await updateSkills([]);

    const updated = readFileSync(join(targetDir, 'SKILL.md'), 'utf-8');
    expect(updated).toContain('v2');
  });

  it('skips skills without metadata without deleting them', async () => {
    const targetDir = join(projectDir, '.claude/skills/no-metadata');
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(
      join(targetDir, 'SKILL.md'),
      "---\nname: no-metadata\ndescription: v1\n---\n\n# Demo\nv1\n"
    );

    await updateSkills([]);

    const content = readFileSync(join(targetDir, 'SKILL.md'), 'utf-8');
    expect(content).toContain('v1');
  });
});
