import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pathToFileURL } from 'url';
import { describe, it, expect, vi } from 'vitest';
import { readSkill } from '../../src/commands/read.js';

const createSkill = (name: string) => `---\nname: ${name}\ndescription: Description for ${name}\n---\n# ${name}\nLocal instructions\n`;

const cleanupDir = (dir: string) => {
  rmSync(dir, { recursive: true, force: true });
};

describe('readSkill file URIs', () => {
  it('reads a skill from a directory file URI', () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'openskills-read-dir-'));
    const skillDir = join(repoDir, 'skills', 'dir-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), createSkill('dir-skill'));

    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(message === undefined ? '' : String(message));
    });

    try {
      readSkill(pathToFileURL(skillDir).toString());
      expect(logs.some((line) => line.includes('Skill read'))).toBe(true);
      expect(logs.join('\n')).toContain('Local instructions');
    } finally {
      logSpy.mockRestore();
      cleanupDir(repoDir);
    }
  });

  it('reads a skill from a SKILL.md file URI', () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'openskills-read-file-'));
    const skillDir = join(repoDir, 'skills', 'file-skill');
    mkdirSync(skillDir, { recursive: true });
    const skillPath = join(skillDir, 'SKILL.md');
    writeFileSync(skillPath, createSkill('file-skill'));

    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(message === undefined ? '' : String(message));
    });

    try {
      readSkill(pathToFileURL(skillPath).toString());
      expect(logs.some((line) => line.includes('Skill read'))).toBe(true);
      expect(logs.join('\n')).toContain('file-skill');
    } finally {
      logSpy.mockRestore();
      cleanupDir(repoDir);
    }
  });
});
