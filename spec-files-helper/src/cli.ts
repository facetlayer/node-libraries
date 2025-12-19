#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SpecFilesHelper } from './index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'list-specs <specs-dir>',
      'List available spec files in a directory',
      (yargs) => {
        return yargs.positional('specs-dir', {
          type: 'string',
          describe: 'Path to the specs directory',
          demandOption: true,
        });
      },
      async (argv) => {
        const helper = new SpecFilesHelper({ dirs: [argv.specsDir as string] });
        helper.printSpecFileList();
      }
    )
    .command(
      'get-spec <specs-dir> <name>',
      'Display the contents of a spec file',
      (yargs) => {
        return yargs
          .positional('specs-dir', {
            type: 'string',
            describe: 'Path to the specs directory',
            demandOption: true,
          })
          .positional('name', {
            type: 'string',
            describe: 'Name of the spec file (without .md extension)',
            demandOption: true,
          });
      },
      async (argv) => {
        const helper = new SpecFilesHelper({ dirs: [argv.specsDir as string] });
        helper.printSpecFileContents(argv.name as string);
      }
    )
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 list-specs ./specs', 'List all spec files in ./specs directory'],
      ['$0 get-spec ./specs project-setup', 'Display the project-setup spec'],
    ])
    .parse();
}

main();
