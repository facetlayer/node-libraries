#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { showHint } from './commands/showHint.ts';
import { claudeIntake } from './commands/claudeIntake.ts';

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('agent-hint-tool')
    .command(
      'show-hint <name>',
      'Show the full contents of a hint file by name',
      (yargs) =>
        yargs.positional('name', {
          describe: 'The name to search for (can be a partial match)',
          type: 'string',
          demandOption: true,
        }),
      (argv) => {
        const name = argv.name as string;
        try {
          showHint(name);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Error:', message);
          process.exit(1);
        }
      },
    )
    .command(
      'claude-intake',
      'Start an interactive Claude session to create a new hint file',
      () => {},
      async () => {
        try {
          await claudeIntake();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Error:', message);
          process.exit(1);
        }
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
