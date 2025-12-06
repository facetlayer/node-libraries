#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './loadEnv.ts';
import { callEndpoint } from './call-command.ts';
import { listEndpoints } from './list-endpoints-command.ts';
import { generateApiClients } from './generate-api-clients.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

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
      'Call an endpoint. Named args starting with { } or [ ] are parsed as JSON.',
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
    .command(
      'generate-api-clients',
      'Generate TypeScript API client types from OpenAPI schema',
      (yargs) => {
        return yargs.option('out', {
          type: 'string',
          array: true,
          demandOption: true,
          describe: 'Output file path(s) to write generated types to',
        });
      },
      async (argv) => {
        try {
          const cwd = process.cwd();
          const config = loadEnv(cwd);
          console.log(`Using API server at: ${config.baseUrl}\n`);
          await generateApiClients(config.baseUrl, argv.out);
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
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('help', 'h')
    .version(packageJson.version)
    .alias('version', 'v')
    .example([
      ['$0 list-endpoints', 'List all available endpoints'],
      ['$0 call /api/users', 'Call GET /api/users'],
      ['$0 call POST /api/users --name "John" --email "john@example.com"', 'call POST with data'],
      ['$0 call POST /api/users --config \'{"timeout":30}\'', 'pass JSON objects as args'],
      ['$0 generate-api-clients --out ./api-types.ts', 'Generate API client types to a file'],
      ['$0 generate-api-clients --out ./types.ts --out ./backup/types.ts', 'Write to multiple files'],
    ])
    .parse();
}

main();
