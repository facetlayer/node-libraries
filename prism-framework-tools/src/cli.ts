#!/usr/bin/env tsx

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import packageJson from '../package.json';
import { loadEnv } from './loadEnv';
import { callEndpoint } from './call-command';
import { listEndpoints } from './list-endpoints-command';

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'list-endpoints',
      'List all available endpoints',
      {},
      async () => {
        try {
          const cwd = process.cwd();
          const config = loadEnv(cwd);
          console.log(`Using API server at: ${config.baseUrl}\n`);
          await listEndpoints(config.baseUrl);
        } catch (error) {
          if (error instanceof Error && error.stack) {
            console.error(error.stack);
          } else {
            console.error('Error:', error instanceof Error ? error.message : String(error));
          }
          process.exit(1);
        }
      }
    )
    .command(
      'call <positionals...>',
      'Call an endpoint',
      (yargs) => {
        return yargs
      },
      async (argv) => {
        try {
          const cwd = process.cwd();
          const config = loadEnv(cwd);

          // Collect all other arguments as request body data
          const requestData: Record<string, any> = {};
          for (const [key, value] of Object.entries(argv)) {

            // Skip known options
            if (['positionals', '_', '$0'].includes(key)) {
              continue;
            }
            requestData[key] = value;
          }

          try {
            const result = await callEndpoint({
              baseUrl: config.baseUrl,
              positionalArgs: argv.positionals as string[],
              namedArgs: requestData,
            });
          } catch (error) {
            console.error('Error calling endpoint:');
            if (error instanceof Error) {
              console.error(error.message);
              if (error.stack) {
                console.error('\nStack trace:');
                console.error(error.stack);
              }
            } else {
              console.error(String(error));
            }
            process.exit(1);
          }
        } catch (error) {
          if (error instanceof Error && error.stack) {
            console.error(error.stack);
          } else {
            console.error('Error:', error instanceof Error ? error.message : String(error));
          }
          process.exit(1);
        }
      }
    )
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 list-endpoints', 'List all available endpoints'],
      ['$0 call /api/users', 'Call GET /api/users'],
      ['$0 call POST /api/users --name "John" --email "john@example.com"', 'call POST with data'],
    ])
    .argv;
}

main();
