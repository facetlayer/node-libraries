#!/usr/bin/env node

import yargs, { type Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { followupCI, getCurrentBranch, getLatestCIRun } from './index.ts';

interface WatchArgv {
  pollInterval: number;
  maxWait: number;
  quiet: boolean;
  prompt?: string;
}

function addWatchOptions(y: Argv) {
  return y
    .option('poll-interval', {
      alias: 'i',
      type: 'number',
      description: 'Poll interval in seconds',
      default: 10,
    })
    .option('max-wait', {
      alias: 'm',
      type: 'number',
      description: 'Maximum wait time in minutes',
      default: 30,
    })
    .option('quiet', {
      alias: 'q',
      type: 'boolean',
      description: 'Suppress status messages',
      default: false,
    })
    .option('prompt', {
      alias: 'p',
      type: 'string',
      description: 'Custom prompt to send to Claude',
    });
}

async function handleWatch(argv: WatchArgv) {
  try {
    const result = await followupCI({
      pollInterval: argv.pollInterval * 1000,
      maxWaitTime: argv.maxWait * 60 * 1000,
      verbose: !argv.quiet,
      customPrompt: argv.prompt,
    });

    if (!result.success && !result.claudeInvoked) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'watch',
      'Watch CI for the current branch and diagnose failures with Claude',
      addWatchOptions,
      handleWatch
    )
    .command(
      'status',
      'Check current CI status for the branch',
      () => {},
      async () => {
        try {
          const branch = await getCurrentBranch();
          console.log(`Branch: ${branch}`);

          const run = await getLatestCIRun(branch);
          if (!run) {
            console.log('No CI runs found for this branch.');
            return;
          }

          console.log(`Workflow: ${run.workflowName}`);
          console.log(`Status: ${run.status}`);
          if (run.conclusion) {
            console.log(`Conclusion: ${run.conclusion}`);
          }
          console.log(`URL: ${run.url}`);
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : error}`);
          process.exit(1);
        }
      }
    )
    .command(
      '$0',
      'Watch CI and diagnose failures (default)',
      addWatchOptions,
      handleWatch
    )
    .help()
    .parse();
}

main();
