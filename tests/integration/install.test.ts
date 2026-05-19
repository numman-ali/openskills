import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { buildCommitUrl } from '../../src/utils/skill-metadata.js';

const testId = Math.random().toString(36).slice(2);
const testTempDir = join(tmpdir(), `openskills-install-${testId}`);
const cliPath = join(process.cwd(), 'dist', 'cli.js');

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

describe('openskills install', () => {
  beforeEach(() => {
    mkdirSync(testTempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testTempDir, { recursive: true, force: true });
  });

  describe('local paths', () => {
    it('should install from absolute local path', () => {
      const sourceDir = join(testTempDir, 'source-skills');
      createTestSkill(sourceDir, 'local-skill', 'Local skill');

      const result = runCli(`install ${join(sourceDir, 'local-skill')} -y`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Installed');

      const installedPath = join(testTempDir, '.claude', 'skills', 'local-skill', 'SKILL.md');
      expect(existsSync(installedPath)).toBe(true);
    });

    it('should install directory of skills from local path', () => {
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

  describe('git install records commitSha + commitUrl (real github.com)', () => {
    it('records 40-char hex commitSha and matching commitUrl for a github skill', () => {
      const result = runCli(`install anthropics/skills/skills/pdf -y`);

      expect(result.exitCode).toBe(0);

      const metadataPath = join(testTempDir, '.claude', 'skills', 'pdf', '.openskills.json');
      expect(existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      expect(metadata.sourceType).toBe('git');
      expect(metadata.commitSha).toMatch(/^[0-9a-f]{40}$/);
      expect(metadata.commitUrl).toBe(
        `https://github.com/anthropics/skills/commit/${metadata.commitSha}`
      );
    });
  });

  describe('buildCommitUrl normalization (pure helper)', () => {
    const sha = 'f458cee31a7577a47ba0c9a101976fa599385174';
    const expectedUrl = `https://github.com/anthropics/skills/commit/${sha}`;

    it('passes through plain HTTPS', () => {
      expect(buildCommitUrl('https://github.com/anthropics/skills', sha)).toBe(expectedUrl);
    });

    it('strips trailing .git from HTTPS', () => {
      expect(buildCommitUrl('https://github.com/anthropics/skills.git', sha)).toBe(expectedUrl);
    });

    it('rewrites SSH form to HTTPS and strips .git', () => {
      expect(buildCommitUrl('git@github.com:anthropics/skills.git', sha)).toBe(expectedUrl);
    });

    it('recognizes SSH form regardless of git@ prefix casing', () => {
      // Rare in practice but harmless to support — pasted/munged URLs sometimes
      // arrive with weird casing.
      expect(buildCommitUrl('Git@github.com:anthropics/skills.git', sha)).toBe(expectedUrl);
      expect(buildCommitUrl('GIT@github.com:anthropics/skills.git', sha)).toBe(expectedUrl);
    });

    it('rewrites git:// scheme to https and strips .git', () => {
      expect(buildCommitUrl('git://github.com/anthropics/skills.git', sha)).toBe(expectedUrl);
    });

    it('returns undefined for non-github hosts (e.g. gitlab.com is not yet supported)', () => {
      // Real gitlab skills repo — picked deliberately so this test stays
      // meaningful if/when someone adds gitlab support and needs to update it.
      expect(buildCommitUrl('https://gitlab.com/gitlab-org/ai/skills', sha)).toBeUndefined();
    });
  });
});
