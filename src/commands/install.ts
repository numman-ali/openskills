import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync, cpSync, statSync } from 'fs';
import { join, basename, resolve, sep } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { checkbox, confirm } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import { hasValidFrontmatter, extractYamlField } from '../utils/yaml.js';
import { ANTHROPIC_MARKETPLACE_SKILLS } from '../utils/marketplace-skills.js';
import type { InstallOptions } from '../types.js';

/**
 * Check if source is a local path
 */
function isLocalPath(source: string): boolean {
  return (
    source.startsWith('/') ||
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('~/')
  );
}

/**
 * Check if source is a git URL (SSH, git://, or HTTPS)
 */
function isGitUrl(source: string): boolean {
  return (
    source.startsWith('git@') ||
    source.startsWith('git://') ||
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.endsWith('.git')
  );
}

/**
 * Expand ~ to home directory
 */
function expandPath(source: string): string {
  if (source.startsWith('~/')) {
    return join(homedir(), source.slice(2));
  }
  return resolve(source);
}

/**
 * Install skill from local path, GitHub, or Git URL
 */
export async function installSkill(source: string, options: InstallOptions): Promise<void> {
  const folder = options.universal ? '.agent/skills' : '.claude/skills';
  const isProject = !options.global; // Default to project unless --global specified
  const targetDir = isProject
    ? join(process.cwd(), folder)
    : join(homedir(), folder);

  const location = isProject
    ? chalk.blue(`project (${folder})`)
    : chalk.dim(`global (~/${folder})`);

  console.log(`Installing from: ${chalk.cyan(source)}`);
  console.log(`Location: ${location}\n`);

  // Handle local path installation
  if (isLocalPath(source)) {
    const localPath = expandPath(source);
    await installFromLocal(localPath, targetDir, options);
    printPostInstallHints(isProject);
    return;
  }

  // Parse git source
  let repoUrl: string;
  let skillSubpath: string = '';

  if (isGitUrl(source)) {
    // Full git URL (SSH, HTTPS, git://)
    repoUrl = source;
  } else {
    // GitHub shorthand: owner/repo or owner/repo/skill-path
    const parts = source.split('/');
    if (parts.length === 2) {
      repoUrl = `https://github.com/${source}`;
    } else if (parts.length > 2) {
      repoUrl = `https://github.com/${parts[0]}/${parts[1]}`;
      skillSubpath = parts.slice(2).join('/');
    } else {
      console.error(chalk.red('Error: Invalid source format'));
      console.error('Expected: owner/repo, owner/repo/skill-name, git URL, or local path');
      process.exit(1);
    }
  }

  // Clone and install from git
  const tempDir = join(homedir(), `.openskills-temp-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const spinner = ora('Cloning repository...').start();
    try {
      execSync(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}/repo"`, {
        stdio: 'pipe',
      });
      spinner.succeed('Repository cloned');
    } catch (error) {
      spinner.fail('Failed to clone repository');
      const err = error as { stderr?: Buffer };
      if (err.stderr) {
        console.error(chalk.dim(err.stderr.toString().trim()));
      }
      console.error(chalk.yellow('\nTip: For private repos, ensure git SSH keys or credentials are configured'));
      process.exit(1);
    }

    const repoDir = join(tempDir, 'repo');

    if (skillSubpath) {
      await installSpecificSkill(repoDir, skillSubpath, targetDir, isProject, options);
    } else {
      await installFromRepo(repoDir, targetDir, options);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  printPostInstallHints(isProject);
}

/**
 * Print post-install hints
 */
function printPostInstallHints(isProject: boolean): void {
  console.log(`\n${chalk.dim('Read skill:')} ${chalk.cyan('openskills read <skill-name>')}`);
  if (isProject) {
    console.log(`${chalk.dim('Sync to AGENTS.md:')} ${chalk.cyan('openskills sync')}`);
  }
}

/**
 * Install from local path (directory containing skills or single skill)
 */
async function installFromLocal(localPath: string, targetDir: string, options: InstallOptions): Promise<void> {
  if (!existsSync(localPath)) {
    console.error(chalk.red(`Error: Path does not exist: ${localPath}`));
    process.exit(1);
  }

  const stats = statSync(localPath);
  if (!stats.isDirectory()) {
    console.error(chalk.red('Error: Path must be a directory'));
    process.exit(1);
  }

  // Check if this is a single skill (has SKILL.md) or a directory of skills
  const skillMdPath = join(localPath, 'SKILL.md');
  if (existsSync(skillMdPath)) {
    // Single skill directory
    const isProject = targetDir.includes(process.cwd());
    await installSingleLocalSkill(localPath, targetDir, isProject, options);
  } else {
    // Directory containing multiple skills
    await installFromRepo(localPath, targetDir, options);
  }
}

/**
 * Install a single local skill directory
 */
async function installSingleLocalSkill(
  skillDir: string,
  targetDir: string,
  isProject: boolean,
  options: InstallOptions
): Promise<void> {
  const skillMdPath = join(skillDir, 'SKILL.md');
  const content = readFileSync(skillMdPath, 'utf-8');

  if (!hasValidFrontmatter(content)) {
    console.error(chalk.red('Error: Invalid SKILL.md (missing YAML frontmatter)'));
    process.exit(1);
  }

  const skillName = basename(skillDir);
  const targetPath = join(targetDir, skillName);

  const shouldInstall = await warnIfConflict(skillName, targetPath, isProject, options.yes);
  if (!shouldInstall) {
    console.log(chalk.yellow(`Skipped: ${skillName}`));
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  // Security: ensure target path stays within target directory
  const resolvedTargetPath = resolve(targetPath);
  const resolvedTargetDir = resolve(targetDir);
  if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
    console.error(chalk.red(`Security error: Installation path outside target directory`));
    process.exit(1);
  }

  cpSync(skillDir, targetPath, { recursive: true, dereference: true });

  console.log(chalk.green(`✅ Installed: ${skillName}`));
  console.log(`   Location: ${targetPath}`);
}

/**
 * Install specific skill from subpath (no interaction needed)
 */
async function installSpecificSkill(
  repoDir: string,
  skillSubpath: string,
  targetDir: string,
  isProject: boolean,
  options: InstallOptions
): Promise<void> {
  const skillDir = join(repoDir, skillSubpath);
  const skillMdPath = join(skillDir, 'SKILL.md');

  if (!existsSync(skillMdPath)) {
    console.error(chalk.red(`Error: SKILL.md not found at ${skillSubpath}`));
    process.exit(1);
  }

  // Validate
  const content = readFileSync(skillMdPath, 'utf-8');
  if (!hasValidFrontmatter(content)) {
    console.error(chalk.red('Error: Invalid SKILL.md (missing YAML frontmatter)'));
    process.exit(1);
  }

  const skillName = basename(skillSubpath);
  const targetPath = join(targetDir, skillName);

  // Warn about potential conflicts
  const shouldInstall = await warnIfConflict(skillName, targetPath, isProject, options.yes);
  if (!shouldInstall) {
    console.log(chalk.yellow(`Skipped: ${skillName}`));
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  // Security: ensure target path stays within target directory
  const resolvedTargetPath = resolve(targetPath);
  const resolvedTargetDir = resolve(targetDir);
  if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
    console.error(chalk.red(`Security error: Installation path outside target directory`));
    process.exit(1);
  }
  cpSync(skillDir, targetPath, { recursive: true, dereference: true });

  console.log(chalk.green(`✅ Installed: ${skillName}`));
  console.log(`   Location: ${targetPath}`);
}

/**
 * Install from repository (with interactive selection unless -y flag)
 */
async function installFromRepo(
  repoDir: string,
  targetDir: string,
  options: InstallOptions
): Promise<void> {
  // Find all skills
  const findSkills = (dir: string): string[] => {
    const skills: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (existsSync(join(fullPath, 'SKILL.md'))) {
          skills.push(fullPath);
        } else {
          skills.push(...findSkills(fullPath));
        }
      }
    }
    return skills;
  };

  const skillDirs = findSkills(repoDir);

  if (skillDirs.length === 0) {
    console.error(chalk.red('Error: No SKILL.md files found in repository'));
    process.exit(1);
  }

  console.log(chalk.dim(`Found ${skillDirs.length} skill(s)\n`));

  // Build skill info list
  const skillInfos = skillDirs
    .map((skillDir) => {
      const skillMdPath = join(skillDir, 'SKILL.md');
      const content = readFileSync(skillMdPath, 'utf-8');

      if (!hasValidFrontmatter(content)) {
        return null;
      }

      const skillName = basename(skillDir);
      const description = extractYamlField(content, 'description');
      const targetPath = join(targetDir, skillName);

      // Get size
      const size = getDirectorySize(skillDir);

      return {
        skillDir,
        skillName,
        description,
        targetPath,
        size,
      };
    })
    .filter((info) => info !== null);

  if (skillInfos.length === 0) {
    console.error(chalk.red('Error: No valid SKILL.md files found'));
    process.exit(1);
  }

  // Interactive selection (unless -y flag or single skill)
  let skillsToInstall = skillInfos;

  if (!options.yes && skillInfos.length > 1) {
    try {
      const choices = skillInfos.map((info) => ({
        name: `${chalk.bold(info.skillName.padEnd(25))} ${chalk.dim(formatSize(info.size))}`,
        value: info.skillName,
        description: info.description.slice(0, 80),
        checked: true, // Check all by default
      }));

      const selected = await checkbox({
        message: 'Select skills to install',
        choices,
        pageSize: 15,
      });

      if (selected.length === 0) {
        console.log(chalk.yellow('No skills selected. Installation cancelled.'));
        return;
      }

      skillsToInstall = skillInfos.filter((info) => selected.includes(info.skillName));
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\n\nCancelled by user'));
        process.exit(0);
      }
      throw error;
    }
  }

  // Install selected skills
  const isProject = targetDir === join(process.cwd(), '.claude/skills');
  let installedCount = 0;

  for (const info of skillsToInstall) {
    // Warn about conflicts
    const shouldInstall = await warnIfConflict(info.skillName, info.targetPath, isProject, options.yes);
    if (!shouldInstall) {
      console.log(chalk.yellow(`Skipped: ${info.skillName}`));
      continue; // Skip this skill, continue with next
    }

    mkdirSync(targetDir, { recursive: true });
    // Security: ensure target path stays within target directory
    const resolvedTargetPath = resolve(info.targetPath);
    const resolvedTargetDir = resolve(targetDir);
    if (!resolvedTargetPath.startsWith(resolvedTargetDir + sep)) {
      console.error(chalk.red(`Security error: Installation path outside target directory`));
      continue;
    }
    cpSync(info.skillDir, info.targetPath, { recursive: true, dereference: true });

    console.log(chalk.green(`✅ Installed: ${info.skillName}`));
    installedCount++;
  }

  console.log(chalk.green(`\n✅ Installation complete: ${installedCount} skill(s) installed`));
}

/**
 * Warn if installing could conflict with Claude Code marketplace
 * Returns true if should proceed, false if should skip
 */
async function warnIfConflict(skillName: string, targetPath: string, isProject: boolean, skipPrompt = false): Promise<boolean> {
  // Check if overwriting existing skill
  if (existsSync(targetPath)) {
    if (skipPrompt) {
      // Auto-overwrite in non-interactive mode
      console.log(chalk.dim(`Overwriting: ${skillName}`));
      return true;
    }
    try {
      const shouldOverwrite = await confirm({
        message: chalk.yellow(`Skill '${skillName}' already exists. Overwrite?`),
        default: false,
      });

      if (!shouldOverwrite) {
        return false; // Skip this skill, continue with others
      }
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\n\nCancelled by user'));
        process.exit(0);
      }
      throw error;
    }
  }

  // Warn about marketplace conflicts (global install only)
  if (!isProject && ANTHROPIC_MARKETPLACE_SKILLS.includes(skillName)) {
    console.warn(chalk.yellow(`\n⚠️  Warning: '${skillName}' matches an Anthropic marketplace skill`));
    console.warn(chalk.dim('   Installing globally may conflict with Claude Code plugins.'));
    console.warn(chalk.dim('   If you re-enable Claude plugins, this will be overwritten.'));
    console.warn(chalk.dim('   Recommend: Use --project flag for conflict-free installation.\n'));
  }

  return true; // OK to proceed
}

/**
 * Get directory size in bytes
 */
function getDirectorySize(dirPath: string): number {
  let size = 0;

  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isFile()) {
      size += statSync(fullPath).size;
    } else if (entry.isDirectory()) {
      size += getDirectorySize(fullPath);
    }
  }

  return size;
}

/**
 * Format bytes to human-readable size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
