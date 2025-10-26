#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync, cpSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

// Default skill directories
const getSkillsDir = (projectLocal = false) => {
  return projectLocal
    ? join(process.cwd(), '.claude/skills')
    : join(homedir(), '.claude/skills');
};

// Helper: Extract YAML frontmatter field
function extractYamlField(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

// Helper: Find all skills
function findAllSkills() {
  const skills = [];
  const dirs = [
    join(process.cwd(), '.claude/skills'),  // Project-local
    join(homedir(), '.claude/skills'),       // Global
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(dir, entry.name, 'SKILL.md');
        if (existsSync(skillPath)) {
          const content = readFileSync(skillPath, 'utf-8');
          const isProjectLocal = dir === join(process.cwd(), '.claude/skills');

          skills.push({
            name: entry.name,
            description: extractYamlField(content, 'description'),
            location: isProjectLocal ? 'project' : 'global',
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
  const dirs = [
    join(process.cwd(), '.claude/skills'),  // Project-local first
    join(homedir(), '.claude/skills'),       // Global second
  ];

  for (const dir of dirs) {
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

  const skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed.\n');
    console.log('Install skills:');
    console.log('  openskills install anthropics/skills              # Global');
    console.log('  openskills install anthropics/skills --project    # Project-local');
    return;
  }

  // Group by location
  const projectSkills = skills.filter(s => s.location === 'project');
  const globalSkills = skills.filter(s => s.location === 'global');

  if (projectSkills.length > 0) {
    console.log('.claude/skills/ (project):');
    for (const skill of projectSkills) {
      console.log(`  ${skill.name.padEnd(20)}`);
      console.log(`    ${skill.description}\n`);
    }
  }

  if (globalSkills.length > 0) {
    console.log('~/.claude/skills/ (global):');
    for (const skill of globalSkills) {
      console.log(`  ${skill.name.padEnd(20)}`);
      console.log(`    ${skill.description}\n`);
    }
  }

  console.log(`Total: ${skills.length} skill(s)`);
}

// Command: install
function installSkill(source, options) {
  const targetDir = options.project
    ? join(process.cwd(), '.claude/skills')
    : join(homedir(), '.claude/skills');

  const location = options.project ? 'project (.claude/skills)' : 'global (~/.claude/skills)';

  console.log(`Installing from: ${source}`);
  console.log(`Location: ${location}\n`);

  // Parse source
  let repoUrl, skillSubpath;

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

      console.log(`\n✅ Installation complete: ${installedCount} skill(s) installed`);
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
    console.error('  .claude/skills/ (project)');
    console.error('  ~/.claude/skills/ (global)');
    console.error('\nInstall skills: openskills install owner/repo');
    process.exit(1);
  }

  const content = readFileSync(skill.path, 'utf-8');

  // Output in Claude Code format
  console.log(`Loading: ${skillName}`);
  console.log(`Base directory: ${skill.baseDir}`);
  console.log('');
  console.log(content);
  console.log('');
  console.log(`Skill loaded: ${skillName}`);
}

// Command: remove
function removeSkill(skillName, options) {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    process.exit(1);
  }

  rmSync(skill.baseDir, { recursive: true, force: true });

  const location = skill.source.includes(homedir()) ? 'global' : 'project';
  console.log(`✅ Removed: ${skillName}`);
  console.log(`   From: ${location} (${skill.source})`);
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
  .command('install <source>')
  .description('Install skill from GitHub or Git URL')
  .option('-p, --project', 'Install to project .claude/skills/ (default: global ~/.claude/skills/)')
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
