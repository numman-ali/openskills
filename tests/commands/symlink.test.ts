import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readlinkSync, lstatSync } from 'fs';
import { join } from 'path';
import { installSkill } from '../../src/commands/install.js';

describe('Symlink support', () => {
    const testDir = join(process.cwd(), 'temp-test-symlink');
    const sourceSkillDir = join(testDir, 'source-skill');
    const targetBaseDir = join(testDir, 'target-skills');
    const targetPath = join(targetBaseDir, 'source-skill');

    beforeEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        mkdirSync(testDir);
        mkdirSync(sourceSkillDir);
        mkdirSync(targetBaseDir);
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should create a symlink when --symlink is provided for a local path', async () => {
        vi.spyOn(process, 'cwd').mockReturnValue(testDir);
        writeFileSync(join(sourceSkillDir, 'SKILL.md'), '---\nname: Test Skill\ndescription: Test\n---');

        // We use --universal and --project (default) to target testDir/.agent/skills
        const options = { symlink: true, universal: true, yes: true };
        const finalTargetDir = join(testDir, '.agent/skills');
        const finalTargetPath = join(finalTargetDir, 'source-skill');

        await installSkill(sourceSkillDir, options);

        expect(existsSync(finalTargetPath)).toBe(true);
        expect(lstatSync(finalTargetPath).isSymbolicLink()).toBe(true);
        expect(readlinkSync(finalTargetPath)).toBe(sourceSkillDir);

        vi.restoreAllMocks();
    });

    it('should overwrite existing directory with a symlink when --symlink is provided', async () => {
        vi.spyOn(process, 'cwd').mockReturnValue(testDir);
        writeFileSync(join(sourceSkillDir, 'SKILL.md'), '---\nname: Test Skill\ndescription: Test\n---');

        const finalTargetDir = join(testDir, '.agent/skills');
        const finalTargetPath = join(finalTargetDir, 'source-skill');

        // Create a directory at the target path first
        mkdirSync(finalTargetDir, { recursive: true });
        mkdirSync(finalTargetPath);
        writeFileSync(join(finalTargetPath, 'old.txt'), 'old');

        const options = { symlink: true, universal: true, yes: true };
        await installSkill(sourceSkillDir, options);

        expect(existsSync(finalTargetPath)).toBe(true);
        expect(lstatSync(finalTargetPath).isSymbolicLink()).toBe(true);
        expect(readlinkSync(finalTargetPath)).toBe(sourceSkillDir);
        expect(existsSync(join(finalTargetPath, 'old.txt'))).toBe(false);

        vi.restoreAllMocks();
    });

    it('should create multiple symlinks when installing from a directory of skills', async () => {
        vi.spyOn(process, 'cwd').mockReturnValue(testDir);

        const skill1Dir = join(sourceSkillDir, 'skill1');
        const skill2Dir = join(sourceSkillDir, 'skill2');
        mkdirSync(skill1Dir);
        mkdirSync(skill2Dir);
        writeFileSync(join(skill1Dir, 'SKILL.md'), '---\nname: Skill 1\n---');
        writeFileSync(join(skill2Dir, 'SKILL.md'), '---\nname: Skill 2\n---');

        // We use -y to skip interactive selection
        const options = { symlink: true, universal: true, yes: true };
        const finalTargetDir = join(testDir, '.agent/skills');

        await installSkill(sourceSkillDir, options);

        const target1 = join(finalTargetDir, 'skill1');
        const target2 = join(finalTargetDir, 'skill2');

        expect(existsSync(target1)).toBe(true);
        expect(lstatSync(target1).isSymbolicLink()).toBe(true);
        expect(readlinkSync(target1)).toBe(skill1Dir);

        expect(existsSync(target2)).toBe(true);
        expect(lstatSync(target2).isSymbolicLink()).toBe(true);
        expect(readlinkSync(target2)).toBe(skill2Dir);

        vi.restoreAllMocks();
    });
});
