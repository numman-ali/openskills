import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pathToFileURL } from 'url';
import { describe, it, expect, vi } from 'vitest';
import { installSkill } from '../../src/commands/install.js';

const createSkill = (name: string, description = 'Local skill description') => `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n`;

const setupProjectDir = () => mkdtempSync(join(tmpdir(), 'openskills-project-'));
const setupRepoDir = () => mkdtempSync(join(tmpdir(), 'openskills-local-repo-'));

const cleanupDir = (dir: string) => {
  rmSync(dir, { recursive: true, force: true });
};

describe('installSkill with file URIs', () => {
  it('installs skills when given a local file URI', async () => {
    const projectDir = setupProjectDir();
    const repoDir = setupRepoDir();
    const skillDir = join(repoDir, 'skills', 'demo-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), createSkill('demo-skill'));

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);

    try {
      await installSkill(pathToFileURL(repoDir).toString(), { yes: true });

      const installedSkillPath = join(projectDir, '.claude/skills/demo-skill/SKILL.md');
      expect(existsSync(installedSkillPath)).toBe(true);
      expect(readFileSync(installedSkillPath, 'utf-8')).toContain('demo-skill');
    } finally {
      cwdSpy.mockRestore();
      cleanupDir(projectDir);
      cleanupDir(repoDir);
    }
  });

  it('installs a specific local skill when a fragment path is provided', async () => {
    const projectDir = setupProjectDir();
    const repoDir = setupRepoDir();
    const firstSkill = join(repoDir, 'packages', 'alpha-skill');
    const secondSkill = join(repoDir, 'packages', 'beta-skill');
    mkdirSync(firstSkill, { recursive: true });
    mkdirSync(secondSkill, { recursive: true });
    writeFileSync(join(firstSkill, 'SKILL.md'), createSkill('alpha-skill'));
    writeFileSync(join(secondSkill, 'SKILL.md'), createSkill('beta-skill'));

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);

    try {
      const fileUri = pathToFileURL(repoDir).toString();
      await installSkill(`${fileUri}#packages/beta-skill`, { yes: true });

      const alphaPath = join(projectDir, '.claude/skills/alpha-skill');
      const betaSkillPath = join(projectDir, '.claude/skills/beta-skill', 'SKILL.md');

      expect(existsSync(alphaPath)).toBe(false);
      expect(readFileSync(betaSkillPath, 'utf-8')).toContain('beta-skill');
    } finally {
      cwdSpy.mockRestore();
      cleanupDir(projectDir);
      cleanupDir(repoDir);
    }
  });
});
