import { describe, it, expect } from 'vitest';
import { resolve, join, sep, win32, basename } from 'path';
import { homedir, tmpdir } from 'os';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { extractYamlField, hasValidFrontmatter } from '../../src/utils/yaml.js';

// We need to test the helper functions, but they're not exported
// So we'll test them indirectly or create a test module
// For now, let's test the logic patterns directly

describe('install.ts helper functions', () => {
  describe('isLocalPath detection', () => {
    // Replicate the logic from isLocalPath()
    const isLocalPath = (source: string): boolean => {
      return (
        source.startsWith('/') ||
        source.startsWith('./') ||
        source.startsWith('../') ||
        source.startsWith('~/')
      );
    };

    it('should detect absolute paths starting with /', () => {
      expect(isLocalPath('/absolute/path/to/skill')).toBe(true);
      expect(isLocalPath('/Users/test/skills')).toBe(true);
    });

    it('should detect relative paths starting with ./', () => {
      expect(isLocalPath('./relative/path')).toBe(true);
      expect(isLocalPath('./skill')).toBe(true);
    });

    it('should detect parent relative paths starting with ../', () => {
      expect(isLocalPath('../parent/path')).toBe(true);
      expect(isLocalPath('../../../deep/path')).toBe(true);
    });

    it('should detect home directory paths starting with ~/', () => {
      expect(isLocalPath('~/skills/my-skill')).toBe(true);
      expect(isLocalPath('~/.claude/skills')).toBe(true);
    });

    it('should NOT detect GitHub shorthand as local path', () => {
      expect(isLocalPath('owner/repo')).toBe(false);
      expect(isLocalPath('anthropics/skills')).toBe(false);
      expect(isLocalPath('owner/repo/skill-path')).toBe(false);
    });

    it('should NOT detect git URLs as local path', () => {
      expect(isLocalPath('git@github.com:owner/repo.git')).toBe(false);
      expect(isLocalPath('https://github.com/owner/repo')).toBe(false);
      expect(isLocalPath('http://github.com/owner/repo')).toBe(false);
    });

    it('should NOT detect plain names as local path', () => {
      expect(isLocalPath('skill-name')).toBe(false);
      expect(isLocalPath('my-skill')).toBe(false);
    });
  });

  describe('isGitUrl detection', () => {
    // Replicate the logic from isGitUrl()
    const isGitUrl = (source: string): boolean => {
      return (
        source.startsWith('git@') ||
        source.startsWith('git://') ||
        source.startsWith('http://') ||
        source.startsWith('https://') ||
        source.endsWith('.git')
      );
    };

    it('should detect SSH git URLs', () => {
      expect(isGitUrl('git@github.com:owner/repo.git')).toBe(true);
      expect(isGitUrl('git@gitlab.com:group/project.git')).toBe(true);
      expect(isGitUrl('git@bitbucket.org:team/repo.git')).toBe(true);
    });

    it('should detect git:// protocol URLs', () => {
      expect(isGitUrl('git://github.com/owner/repo.git')).toBe(true);
    });

    it('should detect HTTPS URLs', () => {
      expect(isGitUrl('https://github.com/owner/repo')).toBe(true);
      expect(isGitUrl('https://github.com/owner/repo.git')).toBe(true);
      expect(isGitUrl('https://gitlab.com/group/project')).toBe(true);
    });

    it('should detect HTTP URLs', () => {
      expect(isGitUrl('http://github.com/owner/repo')).toBe(true);
    });

    it('should detect URLs ending in .git', () => {
      expect(isGitUrl('custom-host.com/repo.git')).toBe(true);
      expect(isGitUrl('anything.git')).toBe(true);
    });

    it('should NOT detect GitHub shorthand as git URL', () => {
      expect(isGitUrl('owner/repo')).toBe(false);
      expect(isGitUrl('anthropics/skills')).toBe(false);
    });

    it('should NOT detect local paths as git URL', () => {
      expect(isGitUrl('/absolute/path')).toBe(false);
      expect(isGitUrl('./relative/path')).toBe(false);
      expect(isGitUrl('~/home/path')).toBe(false);
    });
  });

  describe('expandPath tilde expansion', () => {
    // Replicate the logic from expandPath()
    const expandPath = (source: string): string => {
      if (source.startsWith('~/')) {
        return join(homedir(), source.slice(2));
      }
      return resolve(source);
    };

    it('should expand ~ to home directory', () => {
      const expanded = expandPath('~/skills/test');
      expect(expanded).toBe(join(homedir(), 'skills/test'));
    });

    it('should expand ~/.claude/skills correctly', () => {
      const expanded = expandPath('~/.claude/skills');
      expect(expanded).toBe(join(homedir(), '.claude/skills'));
    });

    it('should resolve relative paths', () => {
      const expanded = expandPath('./relative');
      expect(expanded).toBe(resolve('./relative'));
    });

    it('should keep absolute paths as-is (resolved)', () => {
      const expanded = expandPath('/absolute/path');
      expect(expanded).toBe('/absolute/path');
    });
  });

  describe('path traversal security', () => {
    // Test the security check logic
    const isPathSafe = (
      targetPath: string,
      targetDir: string,
      pathResolve = resolve,
      pathSep = sep
    ): boolean => {
      const resolvedTargetPath = pathResolve(targetPath);
      const resolvedTargetDir = pathResolve(targetDir);
      const resolvedTargetDirWithSep = resolvedTargetDir.endsWith(pathSep)
        ? resolvedTargetDir
        : resolvedTargetDir + pathSep;
      return resolvedTargetPath.startsWith(resolvedTargetDirWithSep);
    };

    it('should allow normal skill paths within target directory', () => {
      expect(isPathSafe('/home/user/.claude/skills/my-skill', '/home/user/.claude/skills')).toBe(true);
    });

    it('should block path traversal attempts with ../', () => {
      expect(isPathSafe('/home/user/.claude/skills/../../../etc/passwd', '/home/user/.claude/skills')).toBe(false);
    });

    it('should block paths outside target directory', () => {
      expect(isPathSafe('/etc/passwd', '/home/user/.claude/skills')).toBe(false);
    });

    it('should block paths that are prefix but not subdirectory', () => {
      // /home/user/.claude/skills-evil should NOT be allowed when target is /home/user/.claude/skills
      expect(isPathSafe('/home/user/.claude/skills-evil', '/home/user/.claude/skills')).toBe(false);
    });

    it('should allow nested subdirectories', () => {
      expect(isPathSafe('/home/user/.claude/skills/category/my-skill', '/home/user/.claude/skills')).toBe(true);
    });

    it('should allow Windows paths within target directory', () => {
      expect(
        isPathSafe(
          'C:\\Users\\dev\\.claude\\skills\\my-skill',
          'C:\\Users\\dev\\.claude\\skills',
          win32.resolve,
          win32.sep
        )
      ).toBe(true);
    });

    it('should block Windows path traversal attempts', () => {
      expect(
        isPathSafe(
          'C:\\Users\\dev\\.claude\\skills\\..\\..\\Windows',
          'C:\\Users\\dev\\.claude\\skills',
          win32.resolve,
          win32.sep
        )
      ).toBe(false);
    });

    it('should block Windows prefix-but-not-child paths', () => {
      expect(
        isPathSafe(
          'C:\\Users\\dev\\.claude\\skills-evil',
          'C:\\Users\\dev\\.claude\\skills',
          win32.resolve,
          win32.sep
        )
      ).toBe(false);
    });
  });

  describe('root SKILL.md detection', () => {
    const getRootSkillName = (repoDir: string, repoName?: string): string | null => {
      const skillPath = join(repoDir, 'SKILL.md');
      if (!existsSync(skillPath)) return null;
      const content = readFileSync(skillPath, 'utf-8');
      if (!hasValidFrontmatter(content)) return null;
      return extractYamlField(content, 'name') || repoName || basename(repoDir);
    };

    it('should detect root SKILL.md and use frontmatter name', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'openskills-test-'));
      try {
        writeFileSync(
          join(tempDir, 'SKILL.md'),
          "---\nname: claude-android-skill\ndescription: Android helper\n---\n\n# Skill\n"
        );
        expect(getRootSkillName(tempDir, 'claude-android-skill')).toBe('claude-android-skill');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should fall back to repo name when frontmatter name is missing', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'openskills-test-'));
      try {
        writeFileSync(
          join(tempDir, 'SKILL.md'),
          "---\ndescription: Android helper\n---\n\n# Skill\n"
        );
        expect(getRootSkillName(tempDir, 'claude-android-skill')).toBe('claude-android-skill');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});

describe('GitHub shorthand parsing', () => {
  // Test the parsing logic for owner/repo and owner/repo/path
  const parseGitHubShorthand = (source: string): { repoUrl: string; skillSubpath: string } | null => {
    const parts = source.split('/');
    if (parts.length === 2) {
      return {
        repoUrl: `https://github.com/${source}`,
        skillSubpath: '',
      };
    } else if (parts.length > 2) {
      return {
        repoUrl: `https://github.com/${parts[0]}/${parts[1]}`,
        skillSubpath: parts.slice(2).join('/'),
      };
    }
    return null;
  };

  it('should parse owner/repo format', () => {
    const result = parseGitHubShorthand('anthropics/skills');
    expect(result).not.toBeNull();
    expect(result?.repoUrl).toBe('https://github.com/anthropics/skills');
    expect(result?.skillSubpath).toBe('');
  });

  it('should parse owner/repo/skill-path format', () => {
    const result = parseGitHubShorthand('anthropics/skills/document-skills/pdf');
    expect(result).not.toBeNull();
    expect(result?.repoUrl).toBe('https://github.com/anthropics/skills');
    expect(result?.skillSubpath).toBe('document-skills/pdf');
  });

  it('should parse owner/repo/nested/path format', () => {
    const result = parseGitHubShorthand('owner/repo/deep/nested/skill');
    expect(result).not.toBeNull();
    expect(result?.repoUrl).toBe('https://github.com/owner/repo');
    expect(result?.skillSubpath).toBe('deep/nested/skill');
  });

  it('should return null for single part', () => {
    const result = parseGitHubShorthand('single');
    expect(result).toBeNull();
  });
});
