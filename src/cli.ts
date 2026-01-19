#!/usr/bin/env node

import { Command } from 'commander';
import { listSkills } from './commands/list.js';
import { installSkill } from './commands/install.js';
import { readSkill } from './commands/read.js';
import { removeSkill } from './commands/remove.js';
import { manageSkills } from './commands/manage.js';
import { syncAgentsMd } from './commands/sync.js';
import { updateSkills } from './commands/update.js';
import { createRequire } from 'module';

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

program
  .name('openskills')
  .description('Universal skills loader for AI coding agents')
  .version(version)
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
  .command('read <skill-names...>')
  .description('Read skill(s) to stdout (for AI agents)')
  .action(readSkill);

program
  .command('update [skill-names...]')
  .description('Update installed skills from their source (default: all)')
  .action(updateSkills);

program
  .command('sync')
  .description('Update AGENTS.md with installed skills (interactive, pre-selects current state)')
  .option('-y, --yes', 'Skip interactive selection, sync all skills')
  .option('-o, --output <path>', 'Output file path (default: AGENTS.md)')
  .option('-t, --cli-tool <name>', 'Custom tool name to use instead of "Bash" (e.g., "bash", "Bash", "Shell")')
  .action(syncAgentsMd);

program
  .command('manage')
  .description('Interactively manage (remove) installed skills')
  .option('--force', 'Permanently delete instead of moving to trash')
  .action(async (options) => {
    try {
      await manageSkills(options);
    } catch (error) {
      console.error('Error managing skills:', error);
      process.exit(1);
    }
  });

program
  .command('remove <skill-name>')
  .alias('rm')
  .description('Remove specific skill (for scripts, use manage for interactive)')
  .option('--force', 'Permanently delete skill (bypass trash)')
  .action(async (skillName: string, options: { force?: boolean; }) => {
    try {
      await removeSkill(skillName, { permanent: options.force });
    } catch (error) {
      console.error('Error removing skill:', error);
      process.exit(1);
    }
  });

program.parse();
