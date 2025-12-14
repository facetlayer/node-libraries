#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createWorktree, validateCurrentBranch } from './worktree/createWorktree.ts';
import { setupNewWorktree } from './worktree/setupNewWorktree.ts';
import { openItermWindow } from './workflow/openItermWindow.ts';
import { promptUserToWriteFile } from './workflow/promptUserToWriteFile.ts';
import { runTaskInWorktree, saveInstructions } from './workflow/runTaskInWorktree.ts';
import { getConfig } from './config/index.ts';

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('claude-worktree')
    .command(
      'start <branch-name>',
      'Start a new Claude task in a worktree',
      (yargs) =>
        yargs.positional('branch-name', {
          describe: 'Name of the branch to create',
          type: 'string',
          demandOption: true,
        }),
      async (argv) => {
        const branchName = argv['branch-name'] as string;

        try {
          // Step 1: Validate we're on main branch
          validateCurrentBranch();

          // Step 2: Open vim to get the prompt
          console.log('\nStep 1: Write your task instructions...\n');
          const taskContent = promptUserToWriteFile(branchName);

          // Step 3: Create the worktree
          console.log(`\nStep 2: Creating worktree for branch '${branchName}'...\n`);
          const worktreePath = createWorktree(branchName);

          // Step 4: Save the instructions to the worktree
          saveInstructions(taskContent, worktreePath);

          // Step 5: Open iTerm window to run the remaining steps
          console.log('\nStep 3: Opening iTerm window to complete setup...\n');
          const command = `cd "${worktreePath}" && claude-worktree run`;
          openItermWindow({
            initialCommand: command,
            windowName: branchName,
          });

          console.log(`\nWorktree created at: ${worktreePath}`);
          console.log('iTerm window opened to complete setup and start Claude.');
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Error:', message);
          process.exit(1);
        }
      },
    )
    .command(
      'run',
      'Run Claude task in current worktree (called from iTerm)',
      () => {},
      async () => {
        try {
          await runTaskInWorktree();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Error:', message);
          process.exit(1);
        }
      },
    )
    .command(
      'setup',
      'Set up the current worktree (install deps, configure Claude)',
      () => {},
      async () => {
        try {
          await setupNewWorktree();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Error:', message);
          process.exit(1);
        }
      },
    )
    .command(
      'create <branch-name>',
      'Create a new worktree without starting Claude',
      (yargs) =>
        yargs
          .positional('branch-name', {
            describe: 'Name of the branch to create',
            type: 'string',
            demandOption: true,
          })
          .option('from', {
            describe: 'Branch to create from',
            type: 'string',
            default: 'origin/main',
          }),
      async (argv) => {
        const branchName = argv['branch-name'] as string;
        const fromBranch = argv.from as string;

        try {
          validateCurrentBranch();
          const worktreePath = createWorktree(branchName, fromBranch);
          console.log(`\nWorktree created at: ${worktreePath}`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Error:', message);
          process.exit(1);
        }
      },
    )
    .command(
      'config',
      'Show current configuration',
      () => {},
      () => {
        const config = getConfig();
        console.log('Current configuration:');
        console.log(JSON.stringify(config, null, 2));
      },
    )
    .demandCommand(1, 'You must provide a command')
    .help()
    .strict()
    .parse();
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
