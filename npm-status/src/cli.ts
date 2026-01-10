#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getPublishStatus, printStatus } from './status.ts';

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'status',
      'Check NPM publish status for the current directory',
      (yargs) => {
        return yargs.option('json', {
          type: 'boolean',
          describe: 'Output as JSON',
          default: false,
        });
      },
      async (argv) => {
        try {
          const status = await getPublishStatus(process.cwd());

          if (argv.json) {
            console.log(JSON.stringify(status, null, 2));
          } else {
            printStatus(status);
          }
        } catch (error) {
          console.error('Error:', (error as Error).message);
          process.exit(1);
        }
      }
    )
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('h', 'help')
    .strict()
    .parse();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
