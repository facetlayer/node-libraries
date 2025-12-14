#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolve } from 'path';
import { AppWithLoading } from './components/index.ts';
import { analyzeSettingsWithLLM } from './analyzer/index.ts';

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('claude-settings-tidier')
    .command(
      ['$0 [path]', 'analyze [path]'],
      'Analyze Claude settings files and suggest cleanups',
      (yargs) =>
        yargs.positional('path', {
          describe: 'Path to the project directory',
          type: 'string',
          default: '.',
        }),
      async (argv) => {
        const projectPath = resolve(argv.path as string);

        const { waitUntilExit } = render(
          <AppWithLoading
            projectPath={projectPath}
            analyzeFunction={analyzeSettingsWithLLM}
          />
        );

        await waitUntilExit();
      },
    )
    .help()
    .version()
    .parse();
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
