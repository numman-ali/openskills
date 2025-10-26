#!/usr/bin/env node

import { Command } from 'commander';
import { listSkills } from './commands/list.js';
import { installSkill } from './commands/install.js';
import { readSkill } from './commands/read.js';
import { removeSkill } from './commands/remove.js';
import { syncAgentsMd } from './commands/sync.js';
import { unsyncAgentsMd } from './commands/unsync.js';

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
  .command('read <skill-name>')
  .description('Read skill to stdout (for AI agents)')
  .action(readSkill);

program
  .command('sync')
  .description('Update AGENTS.md with installed skills')
  .option('-i, --interactive', 'Interactively select skills to sync')
  .action(syncAgentsMd);

program
  .command('unsync')
  .description('Remove skills section from AGENTS.md')
  .action(unsyncAgentsMd);

program
  .command('remove <skill-name>')
  .alias('rm')
  .description('Remove installed skill')
  .action(removeSkill);

program.parse();
