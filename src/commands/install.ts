import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync, cpSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { hasValidFrontmatter } from '../utils/yaml.js';
import { ANTHROPIC_MARKETPLACE_SKILLS } from '../utils/marketplace-skills.js';
import type { InstallOptions } from '../types.js';

/**
 * Install skill from GitHub or Git URL
 */
export function installSkill(source: string, options: InstallOptions): void {
  const targetDir = options.project
    ? join(process.cwd(), '.claude/skills')
    : join(homedir(), '.claude/skills');

  const location = options.project ? 'project (.claude/skills)' : 'global (~/.claude/skills)';

  console.log(`Installing from: ${source}`);
  console.log(`Location: ${location}\n`);

  // Parse source
  let repoUrl: string;
  let skillSubpath: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    repoUrl = source;
    skillSubpath = '';
  } else {
    const parts = source.split('/');
    if (parts.length === 2) {
      repoUrl = `https://github.com/${source}`;
      skillSubpath = '';
    } else if (parts.length > 2) {
      repoUrl = `https://github.com/${parts[0]}/${parts[1]}`;
      skillSubpath = parts.slice(2).join('/');
    } else {
      console.error('Error: Invalid source format');
      console.error('Expected: owner/repo or owner/repo/skill-name');
      process.exit(1);
    }
  }

  // Create temp directory
  const tempDir = join(homedir(), '.openskills-temp');
  mkdirSync(tempDir, { recursive: true });

  try {
    // Clone repository
    console.log('Cloning repository...');
    execSync(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}/repo"`, {
      stdio: 'inherit',
    });

    const repoDir = join(tempDir, 'repo');

    if (skillSubpath) {
      installSpecificSkill(repoDir, skillSubpath, targetDir);
    } else {
      installAllSkills(repoDir, targetDir);
    }
  } finally {
    // Cleanup
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('\nRead skill: openskills read <skill-name>');
}

/**
 * Install specific skill from subpath
 */
function installSpecificSkill(repoDir: string, skillSubpath: string, targetDir: string): void {
  const skillDir = join(repoDir, skillSubpath);
  const skillMdPath = join(skillDir, 'SKILL.md');

  if (!existsSync(skillMdPath)) {
    console.error(`Error: SKILL.md not found at ${skillSubpath}`);
    process.exit(1);
  }

  // Validate
  const content = readFileSync(skillMdPath, 'utf-8');
  if (!hasValidFrontmatter(content)) {
    console.error('Error: Invalid SKILL.md (missing YAML frontmatter)');
    process.exit(1);
  }

  const skillName = basename(skillSubpath);
  const targetPath = join(targetDir, skillName);

  // Warn about potential conflicts
  warnIfConflict(skillName, targetPath, options.project || false);

  mkdirSync(targetDir, { recursive: true });
  cpSync(skillDir, targetPath, { recursive: true });

  console.log(`✅ Installed: ${skillName}`);
  console.log(`   Location: ${targetPath}`);
}

/**
 * Install all skills from repository (recursive search)
 */
function installAllSkills(repoDir: string, targetDir: string): void {
  const findSkills = (dir: string): string[] => {
    const skills: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (existsSync(join(fullPath, 'SKILL.md'))) {
          skills.push(fullPath);
        } else {
          // Recurse into subdirectories
          skills.push(...findSkills(fullPath));
        }
      }
    }
    return skills;
  };

  const skillDirs = findSkills(repoDir);

  if (skillDirs.length === 0) {
    console.error('Error: No SKILL.md files found in repository');
    process.exit(1);
  }

  let installedCount = 0;

  for (const skillDir of skillDirs) {
    const skillMdPath = join(skillDir, 'SKILL.md');
    const content = readFileSync(skillMdPath, 'utf-8');

    if (!hasValidFrontmatter(content)) {
      const skillName = basename(skillDir);
      console.warn(`⚠️  Skipping ${skillName}: Invalid SKILL.md`);
      continue;
    }

    const skillName = basename(skillDir);
    const targetPath = join(targetDir, skillName);

    // Warn about potential conflicts (pass options.project, defaulting to false)
    const isProject = (targetDir === join(process.cwd(), '.claude/skills'));
    warnIfConflict(skillName, targetPath, isProject);

    mkdirSync(targetDir, { recursive: true });
    cpSync(skillDir, targetPath, { recursive: true });

    console.log(`✅ Installed: ${skillName}`);
    installedCount++;
  }

  console.log(`\n✅ Installation complete: ${installedCount} skill(s) installed`);
}

/**
 * Warn if installing could conflict with Claude Code marketplace
 */
function warnIfConflict(skillName: string, targetPath: string, isProject: boolean): void {
  // Check if overwriting existing skill
  if (existsSync(targetPath)) {
    console.warn(`⚠️  Overwriting existing skill at ${targetPath}`);
  }

  // Warn about marketplace conflicts (global install only)
  if (!isProject && ANTHROPIC_MARKETPLACE_SKILLS.includes(skillName)) {
    console.warn(`\n⚠️  Warning: '${skillName}' matches an Anthropic marketplace skill`);
    console.warn('   Installing globally may conflict with Claude Code plugins.');
    console.warn('   If you re-enable Claude plugins, this will be overwritten.');
    console.warn('   Recommend: Use --project flag for conflict-free installation.\n');
  }
}
