#!/usr/bin/env node

import { Command } from 'commander';
import { listSkills } from './commands/list.js';
import { installSkill } from './commands/install.js';
import { readSkill } from './commands/read.js';
import { removeSkill } from './commands/remove.js';
import { manageSkills } from './commands/manage.js';
import { syncAgentsMd } from './commands/sync.js';

const program = new Command();

program
  .name('openskills')
  .description('Universal skills loader for AI coding agents')
  .version('1.2.1')
  .showHelpAfterError(false)
  .exitOverride((err) => {
    // Handle all commander errors gracefully (no stack traces)
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help' || err.code === 'commander.version') {
      process.exit(0);
    }
    if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
      // Error already displayed by commander
      process.exit(1);
    }
    if (err.code === 'commander.unknownOption' || err.code === 'commander.invalidArgument') {
      // Error already displayed by commander
      process.exit(1);
    }
    // Other errors
    process.exit(err.exitCode || 1);
  });

program
  .command('list')
  .description('List all installed skills')
  .action(listSkills);

program
  .command('install <source>')
  .description('Install skill from GitHub or Git URL')
  .option('-g, --global', 'Install globally (default: project install)')
  .option('-u, --universal', 'Install to .agent/skills/ (for universal AGENTS.md usage)')
  .option('-y, --yes', 'Skip interactive selection, install all skills found')
  .action(installSkill);

program
  .command('read <skill-name>')
  .description('Read skill to stdout (for AI agents)')
  .action(readSkill);

program
  .command('sync')
  .description('Update AGENTS.md with installed skills (interactive, pre-selects current state)')
  .option('-y, --yes', 'Skip interactive selection, sync all skills')
  .option('-o, --output <path>', 'Output file path (default: AGENTS.md)')
  .action(syncAgentsMd);

program
  .command('manage')
  .description('Interactively manage (remove) installed skills')
  .action(manageSkills);

program
  .command('remove <skill-name>')
  .alias('rm')
  .description('Remove specific skill (for scripts, use manage for interactive)')
  .action(removeSkill);

program.parse();
