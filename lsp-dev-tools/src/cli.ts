#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerFindUnusedCommand } from './commands/find-unused.ts';

async function main(): Promise<void> {
  const cli = yargs(hideBin(process.argv))
    .scriptName('lsp-dev-tools')
    .usage('$0 <command> [options]')
    .demandCommand(1, 'You must specify a command')
    .strictCommands()
    .fail((msg, err, yargs) => {
      if (err) throw err;
      console.error(msg);
      console.error('');
      yargs.showHelp();
      process.exit(1);
    })
    .help()
    .version();

  registerFindUnusedCommand(cli);

  await cli.parse();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
