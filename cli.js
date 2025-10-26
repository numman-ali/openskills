#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, readdirSync, statSync, mkdirSync, rmSync, cpSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir, platform } from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default skill directories (priority order)
const SKILL_DIRS = [
  join(process.cwd(), '.agent/skills'),
  join(process.cwd(), '.claude/skills'),
  join(homedir(), '.openskills'),
];

// Helper: Extract YAML frontmatter field
function extractYamlField(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

// Helper: Find all skills across directories
function findAllSkills() {
  const skills = [];

  for (const dir of SKILL_DIRS) {
    if (!existsSync(dir)) continue;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(dir, entry.name, 'SKILL.md');
        if (existsSync(skillPath)) {
          const content = readFileSync(skillPath, 'utf-8');
          skills.push({
            name: entry.name,
            description: extractYamlField(content, 'description'),
            context: extractYamlField(content, 'context') || 'general',
            location: dir,
            path: join(dir, entry.name),
          });
        }
      }
    }
  }

  return skills;
}

// Helper: Find specific skill
function findSkill(skillName) {
  for (const dir of SKILL_DIRS) {
    const skillPath = join(dir, skillName, 'SKILL.md');
    if (existsSync(skillPath)) {
      return {
        path: skillPath,
        baseDir: join(dir, skillName),
        source: dir,
      };
    }
  }
  return null;
}

// Command: list
function listSkills() {
  console.log('Available Skills:\n');

  const skillsByDir = {};

  for (const dir of SKILL_DIRS) {
    if (existsSync(dir)) {
      skillsByDir[dir] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = join(dir, entry.name, 'SKILL.md');
          if (existsSync(skillPath)) {
            const content = readFileSync(skillPath, 'utf-8');
            skillsByDir[dir].push({
              name: entry.name,
              description: extractYamlField(content, 'description'),
              context: extractYamlField(content, 'context') || 'general',
            });
          }
        }
      }
    }
  }

  // Display grouped by directory
  for (const [dir, skills] of Object.entries(skillsByDir)) {
    if (skills.length === 0) continue;

    const dirName = dir.includes('.agent') ? '.agent/skills' :
                    dir.includes('.claude') ? '.claude/skills' :
                    '~/.openskills';

    console.log(`${dirName}:`);
    for (const skill of skills) {
      console.log(`  ${skill.name.padEnd(20)} [${skill.context}]`);
      console.log(`    ${skill.description}\n`);
    }
  }

  const totalSkills = findAllSkills().length;
  if (totalSkills === 0) {
    console.log('No skills installed.\n');
    console.log('Install skills: openskills get anthropics/skills');
  } else {
    console.log(`Total: ${totalSkills} skill(s)`);
  }
}

// Command: get (install)
function installSkill(source, options) {
  const targetDir = options.target || join(homedir(), '.openskills');

  console.log(`Installing from: ${source}`);
  console.log(`Target: ${targetDir}\n`);

  // Parse source
  let repoUrl, skillSubpath;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    repoUrl = source;
    skillSubpath = '';
  } else {
    // owner/repo or owner/repo/skill-name
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
      // Install specific skill
      const skillDir = join(repoDir, skillSubpath);
      const skillMdPath = join(skillDir, 'SKILL.md');

      if (!existsSync(skillMdPath)) {
        console.error(`Error: SKILL.md not found at ${skillSubpath}`);
        process.exit(1);
      }

      // Validate YAML frontmatter
      const content = readFileSync(skillMdPath, 'utf-8');
      if (!content.startsWith('---')) {
        console.error('Error: Invalid SKILL.md (missing YAML frontmatter)');
        process.exit(1);
      }

      const skillName = basename(skillSubpath);
      const targetPath = join(targetDir, skillName);

      mkdirSync(targetDir, { recursive: true });
      cpSync(skillDir, targetPath, { recursive: true });

      console.log(`✅ Installed: ${skillName}`);
      console.log(`   Location: ${targetPath}`);
    } else {
      // Install all skills from repo
      const findSkills = (dir) => {
        const skills = [];
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
        console.error('Error: No SKILL.md files found in repository');
        process.exit(1);
      }

      let installedCount = 0;

      for (const skillDir of skillDirs) {
        const skillMdPath = join(skillDir, 'SKILL.md');
        const content = readFileSync(skillMdPath, 'utf-8');

        if (!content.startsWith('---')) {
          const skillName = basename(skillDir);
          console.warn(`⚠️  Skipping ${skillName}: Invalid SKILL.md`);
          continue;
        }

        const skillName = basename(skillDir);
        const targetPath = join(targetDir, skillName);

        mkdirSync(targetDir, { recursive: true });
        cpSync(skillDir, targetPath, { recursive: true });

        console.log(`✅ Installed: ${skillName}`);
        installedCount++;
      }

      console.log(`\n✅ Installation complete: ${installedCount} skill(s) installed to ${targetDir}`);
    }
  } finally {
    // Cleanup
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('\nLoad skill: openskills load <skill-name>');
}

// Command: load
function loadSkill(skillName) {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    console.error('\nSearched:');
    for (const dir of SKILL_DIRS) {
      console.error(`  ${dir}`);
    }
    console.error('\nInstall skills: openskills get owner/repo');
    process.exit(1);
  }

  const content = readFileSync(skill.path, 'utf-8');
  const description = extractYamlField(content, 'description');

  // Output in Claude Code format
  console.log(`Loading: ${skillName}`);
  console.log(`Base directory: ${skill.baseDir}`);
  console.log('');
  console.log(content);
  console.log('');
  console.log(`Skill loaded: ${skillName}`);
}

// Command: remove
function removeSkill(skillName) {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    process.exit(1);
  }

  rmSync(skill.baseDir, { recursive: true, force: true });
  console.log(`✅ Removed: ${skillName}`);
  console.log(`   From: ${skill.source}`);
}

// Setup CLI
const program = new Command();

program
  .name('openskills')
  .description('Universal skills loader for AI coding agents')
  .version('1.0.0');

program
  .command('list')
  .description('List all installed skills')
  .action(listSkills);

program
  .command('get <source>')
  .description('Install skill from GitHub or Git URL')
  .option('-t, --target <dir>', 'Installation directory', join(homedir(), '.openskills'))
  .action(installSkill);

program
  .command('load <skill-name>')
  .description('Load skill to stdout (for AI agents)')
  .action(loadSkill);

program
  .command('remove <skill-name>')
  .alias('rm')
  .description('Remove installed skill')
  .action(removeSkill);

program.parse();
