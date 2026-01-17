import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join, resolve, sep } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { findAllSkills } from '../utils/skills.js';
import { normalizeSkillNames } from '../utils/skill-names.js';
import { readSkillMetadata, writeSkillMetadata } from '../utils/skill-metadata.js';

/**
 * Update installed skills from their recorded source metadata.
 */
export async function updateSkills(skillNames: string[] | string | undefined): Promise<void> {
  const requested = normalizeSkillNames(skillNames);
  const skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed.\n');
    console.log('Install skills:');
    console.log(`  ${chalk.cyan('npx openskills install anthropics/skills')}         ${chalk.dim('# Project (default)')}`);
    console.log(`  ${chalk.cyan('npx openskills install owner/skill --global')}     ${chalk.dim('# Global (advanced)')}`);
    return;
  }

  let targets = skills;

  if (requested.length > 0) {
    const requestedSet = new Set(requested);
    targets = skills.filter((skill) => requestedSet.has(skill.name));

    const missing = requested.filter((name) => !skills.some((skill) => skill.name === name));
    if (missing.length > 0) {
      console.log(chalk.yellow(`Skipping missing skills: ${missing.join(', ')}`));
    }
  } else {
    // Default to updating all installed skills
    targets = skills;
  }

  if (targets.length === 0) {
    console.log(chalk.yellow('No matching skills to update.'));
    return;
  }

  let updated = 0;
  let skipped = 0;
  const missingMetadata: string[] = [];
  const missingLocalSource: string[] = [];
  const missingLocalSkillFile: string[] = [];
  const missingRepoUrl: string[] = [];
  const missingRepoSkillFile: Array<{ name: string; subpath: string }> = [];
  const cloneFailures: string[] = [];

  for (const skill of targets) {
    const metadata = readSkillMetadata(skill.path);
    if (!metadata) {
      console.log(chalk.yellow(`Skipped: ${skill.name} (no source metadata; re-install once to enable updates)`));
      missingMetadata.push(skill.name);
      skipped++;
      continue;
    }

    if (metadata.sourceType === 'local') {
      const localPath = metadata.localPath;
      if (!localPath || !existsSync(localPath)) {
        console.log(chalk.yellow(`Skipped: ${skill.name} (local source missing)`));
        missingLocalSource.push(skill.name);
        skipped++;
        continue;
      }
      if (!existsSync(join(localPath, 'SKILL.md'))) {
        console.log(chalk.yellow(`Skipped: ${skill.name} (SKILL.md missing at local source)`));
        missingLocalSkillFile.push(skill.name);
        skipped++;
        continue;
      }
      updateSkillFromDir(skill.path, localPath);
      writeSkillMetadata(skill.path, { ...metadata, installedAt: new Date().toISOString() });
      console.log(chalk.green(`✅ Updated: ${skill.name}`));
      updated++;
      continue;
    }

    if (!metadata.repoUrl) {
      console.log(chalk.yellow(`Skipped: ${skill.name} (missing repo URL metadata)`));
      missingRepoUrl.push(skill.name);
      skipped++;
      continue;
    }

    const tempDir = join(homedir(), `.openskills-temp-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const spinner = ora(`Updating ${skill.name}...`).start();
    try {
      execSync(`git clone --depth 1 --quiet "${metadata.repoUrl}" "${tempDir}/repo"`, { stdio: 'pipe' });
      const repoDir = join(tempDir, 'repo');
      const subpath = metadata.subpath && metadata.subpath !== '.' ? metadata.subpath : '';
      const sourceDir = subpath ? join(repoDir, subpath) : repoDir;

      if (!existsSync(join(sourceDir, 'SKILL.md'))) {
        spinner.fail(`SKILL.md missing for ${skill.name}`);
        console.log(chalk.yellow(`Skipped: ${skill.name} (SKILL.md not found in repo at ${subpath || '.'})`));
        missingRepoSkillFile.push({ name: skill.name, subpath: subpath || '.' });
        skipped++;
        continue;
      }

      updateSkillFromDir(skill.path, sourceDir);
      writeSkillMetadata(skill.path, { ...metadata, installedAt: new Date().toISOString() });
      spinner.succeed(`Updated ${skill.name}`);
      updated++;
    } catch (error) {
      spinner.fail(`Failed to update ${skill.name}`);
      const err = error as { stderr?: Buffer };
      if (err.stderr) {
        console.error(chalk.dim(err.stderr.toString().trim()));
      }
      console.log(chalk.yellow(`Skipped: ${skill.name} (git clone failed)`));
      cloneFailures.push(skill.name);
      skipped++;
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log(chalk.dim(`Summary: ${updated} updated, ${skipped} skipped (${targets.length} total)`));

  if (missingMetadata.length > 0) {
    console.log(chalk.yellow(`Missing source metadata (${missingMetadata.length}): ${missingMetadata.join(', ')}`));
    console.log(chalk.dim('Re-install these skills once to enable updates (e.g., `npx openskills install <source>`).'));
  }
  if (missingLocalSource.length > 0) {
    console.log(chalk.yellow(`Local source missing (${missingLocalSource.length}): ${missingLocalSource.join(', ')}`));
  }
  if (missingLocalSkillFile.length > 0) {
    console.log(chalk.yellow(`Local SKILL.md missing (${missingLocalSkillFile.length}): ${missingLocalSkillFile.join(', ')}`));
  }
  if (missingRepoUrl.length > 0) {
    console.log(chalk.yellow(`Missing repo URL metadata (${missingRepoUrl.length}): ${missingRepoUrl.join(', ')}`));
  }
  if (missingRepoSkillFile.length > 0) {
    const formatted = missingRepoSkillFile.map((item) => `${item.name} (${item.subpath})`).join(', ');
    console.log(chalk.yellow(`Repo SKILL.md missing (${missingRepoSkillFile.length}): ${formatted}`));
  }
  if (cloneFailures.length > 0) {
    console.log(chalk.yellow(`Clone failed (${cloneFailures.length}): ${cloneFailures.join(', ')}`));
  }
}

function updateSkillFromDir(targetPath: string, sourceDir: string): void {
  const targetDir = dirname(targetPath);
  mkdirSync(targetDir, { recursive: true });

  if (!isPathInside(targetPath, targetDir)) {
    console.error(chalk.red('Security error: Installation path outside target directory'));
    process.exit(1);
  }

  rmSync(targetPath, { recursive: true, force: true });
  cpSync(sourceDir, targetPath, { recursive: true, dereference: true });
}

function isPathInside(targetPath: string, targetDir: string): boolean {
  const resolvedTargetPath = resolve(targetPath);
  const resolvedTargetDir = resolve(targetDir);
  const resolvedTargetDirWithSep = resolvedTargetDir.endsWith(sep)
    ? resolvedTargetDir
    : resolvedTargetDir + sep;
  return resolvedTargetPath.startsWith(resolvedTargetDirWithSep);
}
