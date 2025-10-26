#!/usr/bin/env node

import { Command } from 'commander';
import { listSkills } from './commands/list.js';
import { installSkill } from './commands/install.js';
import { loadSkill } from './commands/load.js';
import { removeSkill } from './commands/remove.js';

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
