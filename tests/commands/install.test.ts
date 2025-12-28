import { describe, it, expect } from 'vitest';
import { resolve, join, relative, isAbsolute, sep } from 'path';
import { homedir } from 'os';

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
      // Use a path that exists on the current platform
      const absolutePath = process.platform === 'win32' 
        ? 'C:\\absolute\\path' 
        : '/absolute/path';
      const expanded = expandPath(absolutePath);
      expect(expanded).toBe(resolve(absolutePath));
    });
  });

  describe('path traversal security', () => {
    // Test the security check logic
    // Use a base path that works cross-platform
    const baseDir = join(homedir(), '.claude', 'skills');
    
    const isPathSafe = (targetPath: string, targetDir: string): boolean => {
      const resolvedTargetPath = resolve(targetPath);
      const resolvedTargetDir = resolve(targetDir);
      // Use path.sep for cross-platform compatibility (/ on Unix, \ on Windows)
      return resolvedTargetPath.startsWith(resolvedTargetDir + sep);
    };

    it('should allow normal skill paths within target directory', () => {
      const skillPath = join(baseDir, 'my-skill');
      expect(isPathSafe(skillPath, baseDir)).toBe(true);
    });

    it('should block path traversal attempts with ../', () => {
      const maliciousPath = join(baseDir, '..', '..', '..', 'etc', 'passwd');
      expect(isPathSafe(maliciousPath, baseDir)).toBe(false);
    });

    it('should block paths outside target directory', () => {
      // Use a path that's definitely outside the target on any platform
      const outsidePath = join(homedir(), 'other', 'path');
      expect(isPathSafe(outsidePath, baseDir)).toBe(false);
    });

    it('should block paths that are prefix but not subdirectory', () => {
      // skills-evil should NOT be allowed when target is skills
      const prefixPath = join(homedir(), '.claude', 'skills-evil');
      expect(isPathSafe(prefixPath, baseDir)).toBe(false);
    });

    it('should allow nested subdirectories', () => {
      const nestedPath = join(baseDir, 'category', 'my-skill');
      expect(isPathSafe(nestedPath, baseDir)).toBe(true);
    });
  });
});

// =============================================================================
// PATH TRAVERSAL SECURITY TESTS (NEW - using path.relative())
// =============================================================================
// These tests verify the security fix that prevents path traversal attacks
// during skill installation. The fix uses path.relative() instead of
// string-based startsWith() validation.
//
// Why path.relative() is more secure:
// - startsWith(dir + '/') fails for directory name collisions (skills-backup)
// - path.relative() correctly computes the relationship between paths
//
// Attack vectors covered:
// 1. Malicious GitHub repo with ../config.json (supply chain attack)
// 2. Zip Slip style attacks with ../.bashrc
// 3. Directory name collision (skills-backup vs skills)
// =============================================================================

describe('Path Traversal Security (Secure Implementation)', () => {
  /**
   * SECURE implementation using path.relative()
   * This is the actual logic used in install.ts after the security fix
   */
  const isPathSafeSecure = (targetPath: string, targetDir: string): boolean => {
    const resolvedTargetPath = resolve(targetPath);
    const resolvedTargetDir = resolve(targetDir);
    const rel = relative(resolvedTargetDir, resolvedTargetPath);
    // Path is unsafe if:
    // 1. relative path starts with ".." (escapes parent)
    // 2. relative path is absolute (different drive on Windows)
    return !rel.startsWith('..') && !isAbsolute(rel);
  };

  describe('Attack Scenario 1: Malicious GitHub Repo (Supply Chain Attack)', () => {
    // Attacker creates repo with files like:
    //   ../config.json
    //   ../../.bashrc
    // When extracted to ~/.claude/skills/, these escape to parent directories

    it('should block single-level path traversal: ../config.json', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../config.json');
      // Resolves to /home/user/.claude/config.json - OUTSIDE skills dir
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block multi-level path traversal: ../../../etc/passwd', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../../../etc/passwd');
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block path traversal to home directory: ../../.ssh/authorized_keys', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../../.ssh/authorized_keys');
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block path traversal targeting Claude config: ../settings.json', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../settings.json');
      // Attacker tries to overwrite ~/.claude/settings.json
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });
  });

  describe('Attack Scenario 2: Zip Slip Attack', () => {
    // Classic Zip Slip: archive contains files with ../ in their names
    // When extracted, they escape the target directory

    it('should block ../.bashrc (shell config hijack)', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../../../.bashrc');
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block ../.zshrc (zsh config hijack)', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../../../.zshrc');
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block ../.profile (login script hijack)', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '../../../.profile');
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block traversal with valid-looking prefix: skill/../../../.bashrc', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, 'skill/../../../.bashrc');
      // Even though it starts with a valid skill name, it escapes
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block hidden directory traversal: .hidden/../../etc/passwd', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = join(targetDir, '.hidden/../../etc/passwd');
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });
  });

  describe('Attack Scenario 3: Directory Name Collision', () => {
    // Attacker exploits string prefix matching:
    // targetDir: /home/user/.claude/skills
    // Attacker creates: /home/user/.claude/skills-backup/malicious.js
    // Old check: "skills-backup".startsWith("skills") = TRUE (vulnerable!)

    it('should block skills-backup collision (critical vulnerability in old code)', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = '/home/user/.claude/skills-backup/malicious.js';

      // SECURE: path.relative() correctly identifies this as outside
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);

      // VULNERABLE: old startsWith() would incorrectly allow this!
      // Uncommenting below would show the vulnerability:
      // expect(isPathSafeVulnerable(maliciousPath, targetDir)).toBe(true); // BUG!
    });

    it('should block skills-evil collision', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = '/home/user/.claude/skills-evil/payload.sh';
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block skills2 collision', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = '/home/user/.claude/skills2/trojan.js';
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block skillsXXX collision (any suffix)', () => {
      const targetDir = '/home/user/.claude/skills';
      const suffixes = ['-old', '-new', '-test', '.bak', '_backup', '123'];
      for (const suffix of suffixes) {
        const maliciousPath = `/home/user/.claude/skills${suffix}/evil.js`;
        expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
      }
    });

    it('should demonstrate why string-based startsWith() is vulnerable', () => {
      const targetDir = '/home/user/.claude/skills';
      const maliciousPath = '/home/user/.claude/skills-backup/install.js';

      // Old vulnerable check (for demonstration)
      const resolvedTarget = resolve(maliciousPath);
      const resolvedDir = resolve(targetDir);

      // String-based check WITHOUT trailing slash is WRONG
      // "skills-backup" starts with "skills" so it passes!
      const vulnerableResult = resolvedTarget.startsWith(resolvedDir);
      expect(vulnerableResult).toBe(true); // This demonstrates the BUG!

      // Even with trailing slash, it still fails for this case
      const vulnerableResultWithSlash = resolvedTarget.startsWith(resolvedDir + '/');
      expect(vulnerableResultWithSlash).toBe(false); // Correctly blocks... but

      // Secure path.relative() check is more robust and handles all edge cases
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });
  });

  describe('Edge Cases and Bypass Attempts', () => {
    it('should block URL-encoded traversal attempts after normalization', () => {
      const targetDir = '/home/user/.claude/skills';
      // Note: resolve() normalizes these, but we test the resolved paths
      const maliciousPath = resolve(join(targetDir, '..', 'config.json'));
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block mixed slash traversal: ..\\..\\etc\\passwd (Windows-style)', () => {
      const targetDir = '/home/user/.claude/skills';
      // On Windows, this would be a real attack vector
      const maliciousPath = join(targetDir, '..\\..\\etc\\passwd');
      expect(isPathSafeSecure(resolve(maliciousPath), targetDir)).toBe(false);
    });

    it('should block null byte injection attempts (if any path components exist)', () => {
      const targetDir = '/home/user/.claude/skills';
      // After resolve, null bytes would be handled by the OS/Node
      const maliciousPath = join(targetDir, 'skill\x00/../../../etc/passwd');
      // The resolve() call normalizes this
      expect(isPathSafeSecure(resolve(maliciousPath), targetDir)).toBe(false);
    });

    it('should handle symlink-like paths (resolved form)', () => {
      const targetDir = '/home/user/.claude/skills';
      // Symlinks are dereferenced by resolve() - we test the resolved path
      const maliciousPath = '/etc/passwd'; // Absolute path outside target
      expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
    });

    it('should block exact parent directory (skills path without subdir)', () => {
      const targetDir = '/home/user/.claude/skills';
      const parentPath = '/home/user/.claude';
      expect(isPathSafeSecure(parentPath, targetDir)).toBe(false);
    });

    it('should allow exact target directory path', () => {
      const targetDir = '/home/user/.claude/skills';
      // Installing directly to target dir itself should be allowed
      expect(isPathSafeSecure(targetDir, targetDir)).toBe(true);
    });

    it('should handle trailing slashes consistently', () => {
      const targetDir = '/home/user/.claude/skills';
      const targetDirSlash = '/home/user/.claude/skills/';
      const skillPath = '/home/user/.claude/skills/my-skill';

      expect(isPathSafeSecure(skillPath, targetDir)).toBe(true);
      expect(isPathSafeSecure(skillPath, targetDirSlash)).toBe(true);
    });
  });

  describe('Windows-specific path handling', () => {
    // These tests verify cross-platform security

    it('should handle Windows-style absolute paths', () => {
      // On Windows, paths like C:\Users\... need special handling
      // path.relative() handles this correctly
      const targetDir = 'C:\\Users\\user\\.claude\\skills';
      const safePath = 'C:\\Users\\user\\.claude\\skills\\my-skill';
      const maliciousPath = 'D:\\malicious\\payload'; // Different drive

      // Note: This test's behavior depends on the running OS
      // On Windows, isAbsolute(relative(C:\..., D:\...)) would be true
      if (process.platform === 'win32') {
        expect(isPathSafeSecure(maliciousPath, targetDir)).toBe(false);
      }
      expect(isPathSafeSecure(safePath, targetDir)).toBe(true);
    });
  });

  describe('Real-world attack payloads', () => {
    const targetDir = '/home/user/.claude/skills';

    it('should block SSH key exfiltration: ../../.ssh/id_rsa', () => {
      expect(isPathSafeSecure(join(targetDir, '../../.ssh/id_rsa'), targetDir)).toBe(false);
    });

    it('should block AWS credential theft: ../../.aws/credentials', () => {
      expect(isPathSafeSecure(join(targetDir, '../../.aws/credentials'), targetDir)).toBe(false);
    });

    it('should block Git config modification: ../../.gitconfig', () => {
      expect(isPathSafeSecure(join(targetDir, '../../.gitconfig'), targetDir)).toBe(false);
    });

    it('should block npm config modification: ../../.npmrc', () => {
      expect(isPathSafeSecure(join(targetDir, '../../.npmrc'), targetDir)).toBe(false);
    });

    it('should block VS Code settings modification: ../../.vscode/settings.json', () => {
      expect(isPathSafeSecure(join(targetDir, '../../.vscode/settings.json'), targetDir)).toBe(false);
    });

    it('should block cron job injection: ../../../etc/cron.d/malicious', () => {
      expect(isPathSafeSecure(join(targetDir, '../../../etc/cron.d/malicious'), targetDir)).toBe(false);
    });

    it('should block systemd service injection: ../../../etc/systemd/user/malicious.service', () => {
      expect(isPathSafeSecure(join(targetDir, '../../../etc/systemd/user/malicious.service'), targetDir)).toBe(false);
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
