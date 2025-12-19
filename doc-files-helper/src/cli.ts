#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DocFilesHelper } from './index.ts';
import Path from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __packageRoot = Path.resolve(__dirname, '..');
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const docFiles = new DocFilesHelper({
    files: [ Path.join(__packageRoot, 'README.md')] ,
});

async function main() {
  const args = yargs(hideBin(process.argv))
    .command(
      'browse <docs-dir>',
      'List available doc files in a directory',
      (yargs) => {
        return yargs.positional('docs-dir', {
          type: 'string',
          describe: 'Path to the docs directory',
          demandOption: true,
        });
      },
      async (argv) => {
        const docsDir = argv.docsDir as string;
        const helper = new DocFilesHelper({
            dirs: [docsDir],
            overrideGetSubcommand: `browse-get ${docsDir}`,
        });
        helper.printDocFileList();
      }
    )
    .command(
      'browse-get <docs-dir> <name>',
      'Get the contents of one doc file',
      (yargs) => {
        return yargs
          .positional('docs-dir', {
            type: 'string',
            describe: 'Path to the docs directory',
            demandOption: true,
          })
          .positional('name', {
            type: 'string',
            describe: 'Name of the doc file (without .md extension)',
            demandOption: true,
          });
      },
      async (argv) => {
        const helper = new DocFilesHelper({ dirs: [argv.docsDir as string] });
        helper.printDocFileContents(argv.name as string);
      }
    );

  docFiles.yargsSetup(args);

  args
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 list-docs ./docs', 'List all doc files in ./docs directory'],
      ['$0 get-doc ./docs project-setup', 'Display the project-setup doc'],
    ])
    .parse();
}

main();
