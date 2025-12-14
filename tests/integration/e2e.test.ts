import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const testId = Math.random().toString(36).slice(2);
const testTempDir = join(tmpdir(), `openskills-e2e-${testId}`);
const cliPath = join(process.cwd(), 'dist', 'cli.js');

// Helper to run CLI commands
function runCli(args: string, cwd?: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${cliPath} ${args}`, {
      cwd: cwd || testTempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1,
    };
  }
}

// Helper to create a valid skill
function createTestSkill(dir: string, name: string, description: string = 'Test skill'): void {
  const skillDir = join(dir, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---
name: ${name}
description: ${description}
---

# ${name}

Instructions for ${name}.
`
  );
}

describe('End-to-end CLI tests', () => {
  beforeEach(() => {
    mkdirSync(testTempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testTempDir, { recursive: true, force: true });
  });

  describe('openskills list', () => {
    it('should list installed skills', () => {
      // Create a project skills directory with a skill
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'test-skill', 'A test skill');

      const result = runCli('list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test-skill');
    });

    it('should show summary with skill counts', () => {
      // Create empty project skills directory - global skills may still exist
      mkdirSync(join(testTempDir, '.claude', 'skills'), { recursive: true });

      const result = runCli('list');

      // Should show a summary line with counts
      expect(result.stdout).toMatch(/Summary:|No skills installed/);
    });
  });

  describe('openskills read', () => {
    it('should read skill content', () => {
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'readable-skill', 'Readable skill description');

      const result = runCli('read readable-skill');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('readable-skill');
      expect(result.stdout).toContain('Instructions for readable-skill');
    });

    it('should error for non-existent skill', () => {
      const result = runCli('read non-existent-skill');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });
  });

  describe('openskills sync', () => {
    it('should sync skills to AGENTS.md', () => {
      // Create skill and AGENTS.md
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'sync-skill', 'Skill to sync');
      writeFileSync(join(testTempDir, 'AGENTS.md'), '# AGENTS\n');

      const result = runCli('sync -y');

      expect(result.exitCode).toBe(0);

      const agentsMd = readFileSync(join(testTempDir, 'AGENTS.md'), 'utf-8');
      expect(agentsMd).toContain('sync-skill');
      expect(agentsMd).toContain('<skills_system');
    });

    it('should create output file with --output flag', () => {
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'output-skill', 'Test output');

      const outputPath = join(testTempDir, 'custom-output.md');
      const result = runCli(`sync -y --output ${outputPath}`);

      expect(result.exitCode).toBe(0);
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('output-skill');
    });

    it('should create nested directories with --output flag', () => {
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'nested-skill', 'Test nested');

      const outputPath = join(testTempDir, '.ruler', 'deep', 'AGENTS.md');
      const result = runCli(`sync -y --output ${outputPath}`);

      expect(result.exitCode).toBe(0);
      expect(existsSync(outputPath)).toBe(true);
    });

    it('should reject non-.md output files', () => {
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'any-skill', 'Test');

      const result = runCli(`sync -y --output ${join(testTempDir, 'invalid.txt')}`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('.md');
    });
  });

  describe('openskills install (local paths)', () => {
    it('should install from absolute local path', () => {
      // Create a source skill
      const sourceDir = join(testTempDir, 'source-skills');
      createTestSkill(sourceDir, 'local-skill', 'Local skill');

      // Install to project
      const result = runCli(`install ${join(sourceDir, 'local-skill')} -y`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Installed');

      // Verify skill was copied
      const installedPath = join(testTempDir, '.claude', 'skills', 'local-skill', 'SKILL.md');
      expect(existsSync(installedPath)).toBe(true);
    });

    it('should install directory of skills from local path', () => {
      // Create multiple source skills
      const sourceDir = join(testTempDir, 'multi-skills');
      createTestSkill(sourceDir, 'skill-one', 'First skill');
      createTestSkill(sourceDir, 'skill-two', 'Second skill');

      const result = runCli(`install ${sourceDir} -y`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('skill-one');
      expect(result.stdout).toContain('skill-two');
    });

    it('should error for non-existent local path', () => {
      const result = runCli(`install /non/existent/path -y`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('does not exist');
    });
  });

  describe('openskills remove', () => {
    it('should remove installed skill', () => {
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'removable-skill', 'To be removed');

      const result = runCli('remove removable-skill');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Removed');
      expect(existsSync(join(skillsDir, 'removable-skill'))).toBe(false);
    });

    it('should error for non-existent skill', () => {
      const result = runCli('remove ghost-skill');

      expect(result.exitCode).toBe(1);
    });
  });

  describe('symlinked skills', () => {
    it('should list symlinked skills', () => {
      // Create a skill in a separate location
      const actualSkillDir = join(testTempDir, 'actual-skills');
      createTestSkill(actualSkillDir, 'symlinked-skill', 'Symlinked skill');

      // Create symlink in skills directory
      const skillsDir = join(testTempDir, '.claude', 'skills');
      mkdirSync(skillsDir, { recursive: true });
      symlinkSync(
        join(actualSkillDir, 'symlinked-skill'),
        join(skillsDir, 'symlinked-skill')
      );

      const result = runCli('list');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('symlinked-skill');
    });

    it('should read symlinked skill content', () => {
      const actualSkillDir = join(testTempDir, 'actual-skills');
      createTestSkill(actualSkillDir, 'linked-readable', 'Linked readable');

      const skillsDir = join(testTempDir, '.claude', 'skills');
      mkdirSync(skillsDir, { recursive: true });
      symlinkSync(
        join(actualSkillDir, 'linked-readable'),
        join(skillsDir, 'linked-readable')
      );

      const result = runCli('read linked-readable');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('linked-readable');
    });
  });

  describe('--yes flag behavior', () => {
    it('should auto-overwrite with -y flag', () => {
      // Create initial skill
      const skillsDir = join(testTempDir, '.claude', 'skills');
      createTestSkill(skillsDir, 'overwrite-skill', 'Original');

      // Create source skill to install
      const sourceDir = join(testTempDir, 'source');
      createTestSkill(sourceDir, 'overwrite-skill', 'Updated');

      // Install with -y should overwrite
      const result = runCli(`install ${join(sourceDir, 'overwrite-skill')} -y`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Overwriting');

      // Verify content was updated
      const content = readFileSync(join(skillsDir, 'overwrite-skill', 'SKILL.md'), 'utf-8');
      expect(content).toContain('Updated');
    });
  });
});
