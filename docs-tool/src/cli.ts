#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTarget, browseLocalLibrary, browseNpmLibrary } from './index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'list <target>',
      'List available doc files in a directory or NPM package',
      (yargs) => {
        return yargs.positional('target', {
          type: 'string',
          describe: 'Directory path (starts with . or /) or NPM package name',
          demandOption: true,
        });
      },
      async (argv) => {
        const target = argv.target as string;
        const parsed = parseTarget(target);

        if (parsed.type === 'directory') {
          const local = browseLocalLibrary(parsed.value);
          local.helper.printDocFileList();
        } else {
          const docs = await browseNpmLibrary(parsed.value);
          if (!docs) {
            console.error(`Could not find library: ${parsed.value}`);
            process.exit(1);
          }

          console.log(`\nLibrary: ${docs.libraryName}`);
          console.log(`Path: ${docs.libraryPath}\n`);

          if (!docs.hasReadme && !docs.hasDocsFolder) {
            console.log('No documentation found for this library.');
            console.log('(No README.md or docs/ folder exists)');
            return;
          }

          docs.helper.printDocFileList();
        }
      }
    )
    .command(
      'show <target> [name]',
      'Get the contents of one doc file',
      (yargs) => {
        return yargs
          .positional('target', {
            type: 'string',
            describe: 'Directory path (starts with . or /) or NPM package name',
            demandOption: true,
          })
          .positional('name', {
            type: 'string',
            describe: 'Name of the doc file (defaults to README)',
            default: 'README',
          });
      },
      async (argv) => {
        const target = argv.target as string;
        const name = argv.name as string;
        const parsed = parseTarget(target);

        if (parsed.type === 'directory') {
          const local = browseLocalLibrary(parsed.value);
          local.helper.printDocFileContents(name);
        } else {
          const docs = await browseNpmLibrary(parsed.value);
          if (!docs) {
            console.error(`Could not find library: ${parsed.value}`);
            process.exit(1);
          }

          docs.helper.printDocFileContents(name);
        }
      }
    )
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 list ./docs', 'List all doc files in ./docs directory'],
      ['$0 list lodash', 'List all doc files for the lodash NPM package'],
      ['$0 show ./docs project-setup', 'Display the project-setup doc from ./docs'],
      ['$0 show lodash', 'Display the README for the lodash NPM package'],
    ])
    .parse();
}

main();
