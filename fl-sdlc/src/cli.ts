#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getGuidelines } from './getGuidelines.ts';
import { determineGuidelines } from './determineGuidelines.ts';
import { diffStat } from './diffStat.ts';
import { setupGuidelinesFile } from './setupGuidelinesFile.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'get-guidelines',
      'Read the .PROJECT_GUIDELINES.md file from the current directory',
      () => {},
      async () => {
        const result = getGuidelines();

        if (!result.found) {
          console.log('No .PROJECT_GUIDELINES.md file found.');
          console.log('');
          console.log('This file must be created to define project conventions.');
          console.log('Run `fl-sdlc determine-guidelines` to gather information for creating it.');
          process.exit(1);
        }

        console.log(result.content);
      }
    )
    .command(
      'determine-guidelines',
      'Gather project information to help initialize .PROJECT_GUIDELINES.md',
      () => {},
      async () => {
        const result = await determineGuidelines();

        if (result.mainBranch) {
          console.log(`## Main branch\n${result.mainBranch}\n`);
        } else {
          console.log('## Main branch\n(could not determine)\n');
        }

        if (result.recentCommits) {
          console.log(`## Recent commits\n${result.recentCommits}\n`);
        } else {
          console.log('## Recent commits\n(no commits found)\n');
        }

        if (result.recentPRs) {
          console.log(`## Recent merged PRs\n${result.recentPRs}\n`);
        } else {
          console.log('## Recent merged PRs\n(could not retrieve — gh CLI may not be available)\n');
        }
      }
    )
    .command(
      'diff-stat',
      'Show staged and unstaged change summaries',
      () => {},
      async () => {
        const result = await diffStat();

        if (result.unstaged) {
          console.log('## Unstaged changes');
          console.log(result.unstaged);
        } else {
          console.log('## Unstaged changes\n(none)');
        }

        console.log('');

        if (result.staged) {
          console.log('## Staged changes');
          console.log(result.staged);
        } else {
          console.log('## Staged changes\n(none)');
        }
      }
    )
    .command(
      'setup-guidelines-file',
      'Add .PROJECT_GUIDELINES.md to .git/info/exclude so it stays untracked',
      () => {},
      async () => {
        await setupGuidelinesFile();
      }
    )
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 get-guidelines', 'Read the project guidelines file'],
      ['$0 determine-guidelines', 'Gather info to create guidelines'],
      ['$0 diff-stat', 'Show staged and unstaged change stats'],
      ['$0 setup-guidelines-file', 'Exclude guidelines file from git'],
    ])
    .parse();
}

main();
