#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { formatTocFromFile, getSectionFromFile } from './index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

function checkFileExists(filePath: string): void {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
}

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'toc <file>',
      'Show table of contents with line numbers for a Markdown file',
      (yargs) => {
        return yargs.positional('file', {
          type: 'string',
          describe: 'Path to the Markdown file',
          demandOption: true,
        });
      },
      async (argv) => {
        const filePath = resolve(argv.file as string);
        checkFileExists(filePath);

        const toc = formatTocFromFile(filePath);
        console.log(toc);
      }
    )
    .command(
      'section <file> <text>',
      'Extract a section from a Markdown file by matching the heading text',
      (yargs) => {
        return yargs
          .positional('file', {
            type: 'string',
            describe: 'Path to the Markdown file',
            demandOption: true,
          })
          .positional('text', {
            type: 'string',
            describe: 'Text to match against section headings (substring match)',
            demandOption: true,
          });
      },
      async (argv) => {
        const filePath = resolve(argv.file as string);
        checkFileExists(filePath);

        const searchText = argv.text as string;
        const section = getSectionFromFile(filePath, searchText);

        if (!section) {
          console.error(`Error: No section found matching: ${searchText}`);
          process.exit(1);
        }

        console.log(section.content);
      }
    )
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 toc README.md', 'Show table of contents for README.md'],
      ['$0 section README.md "Installation"', 'Extract the Installation section'],
      ['$0 section docs/guide.md "API"', 'Extract a section matching "API"'],
    ])
    .parse();
}

main();
