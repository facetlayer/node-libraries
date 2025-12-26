#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getDocsForLibrary, findLibrary } from './index.ts';

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'list-docs <library>',
      'List available documentation files for a library',
      (yargs) => {
        return yargs.positional('library', {
          type: 'string',
          describe: 'Name of the npm library (supports partial matching)',
          demandOption: true,
        });
      },
      async (argv) => {
        const libraryName = argv.library as string;
        const docs = getDocsForLibrary(libraryName);

        if (!docs) {
          console.error(`Could not find library: ${libraryName}`);
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
    )
    .command(
      'get-doc <library> [doc-name]',
      'Display the contents of a documentation file',
      (yargs) => {
        return yargs
          .positional('library', {
            type: 'string',
            describe: 'Name of the npm library (supports partial matching)',
            demandOption: true,
          })
          .positional('doc-name', {
            type: 'string',
            describe: 'Name of the doc file (defaults to README)',
            default: 'README',
          });
      },
      async (argv) => {
        const libraryName = argv.library as string;
        const docName = argv['doc-name'] as string;

        const docs = getDocsForLibrary(libraryName);

        if (!docs) {
          console.error(`Could not find library: ${libraryName}`);
          process.exit(1);
        }

        docs.helper.printDocFileContents(docName);
      }
    )
    .command(
      'find <library>',
      'Find a library and show its location',
      (yargs) => {
        return yargs
          .positional('library', {
            type: 'string',
            describe: 'Name of the npm library (supports partial matching)',
            demandOption: true,
          })
          .option('no-install', {
            type: 'boolean',
            describe: 'Do not install the library if not found',
            default: false,
          });
      },
      async (argv) => {
        const libraryName = argv.library as string;
        const skipInstall = argv['no-install'] as boolean;

        const location = findLibrary(libraryName, { skipInstall });

        if (!location) {
          console.error(`Could not find library: ${libraryName}`);
          if (skipInstall) {
            console.error('(Use without --no-install to automatically install)');
          }
          process.exit(1);
        }

        console.log(`Library: ${location.libraryName}`);
        console.log(`Path: ${location.libraryPath}`);
        console.log(`Match type: ${location.matchType}`);
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
