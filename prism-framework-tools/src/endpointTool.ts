#!/usr/bin/env tsx

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pathToFileURL } from 'url';
import * as path from 'path';
import * as fs from 'fs';

/**
 * List all available endpoints from an App instance
 */
function listEndpointsFromApp(app: any): void {
  console.log('Available endpoints:\n');
  const endpoints = app.listAllEndpoints();
  for (const endpoint of endpoints) {
    const fullPath = `${endpoint.method} ${endpoint.path}`;
    console.log(`  ${fullPath}`);
    if (endpoint.description) {
      console.log(`    ${endpoint.description}`);
    }
  }
}

/**
 * Find and load the local getApp function from src/_main/app.ts
 * Returns the getApp function
 * @throws Error if getApp function is not found
 */
async function findApp(cwd: string): Promise<() => any> {
  const commonPaths = [
    './src/_main/app.ts',
    './src/app.ts',
  ];

  for (const commonPath of commonPaths) {
    const absolutePath = path.resolve(cwd, commonPath);
    if (fs.existsSync(absolutePath)) {
      try {
        const appUrl = pathToFileURL(absolutePath).href;
        const appModule = await import(appUrl);
        if (appModule.getApp && typeof appModule.getApp === 'function') {
          console.log(`Found getApp function in: ${absolutePath}`);
          return appModule.getApp;
        }
      } catch (error) {
        console.error(error)
        // Continue searching if this file doesn't work
      }
    }
  }

  throw new Error(
    'Could not find getApp function. Please create src/_main/app.ts with a getApp() export.\n' +
    'Example:\n' +
    '  export function getApp(): App {\n' +
    '    return new App(ALL_SERVICES);\n' +
    '  }'
  );
}

async function main() {
  await yargs(hideBin(process.argv))
    .command(
      'list',
      'List all available endpoints',
      {},
      async () => {
        try {
          const cwd = process.cwd();
          const getApp = await findApp(cwd);
          const app = await getApp();
          listEndpointsFromApp(app);
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
      'run <path>',
      'Run an endpoint',
      (yargs) => {
        return yargs
          .positional('path', {
            type: 'string',
            description: 'Endpoint path (e.g., /api/users)',
            demandOption: true,
          })
          .option('method', {
            type: 'string',
            description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
            default: 'GET',
          });
      },
      async (argv) => {
        try {
          const cwd = process.cwd();
          const getApp = await findApp(cwd);
          const app = await getApp();

          // Collect all other arguments as request body data
          const requestData: Record<string, any> = {};
          for (const [key, value] of Object.entries(argv)) {
            // Skip known options
            if (['path', 'method', '_', '$0'].includes(key)) {
              continue;
            }
            requestData[key] = value;
          }

          console.log(`Running: ${argv.method} ${argv.path}`);
          if (Object.keys(requestData).length > 0) {
            console.log('Request data:', JSON.stringify(requestData, null, 2));
          }
          console.log();

          try {
            const result = await app.callEndpoint({
              method: argv.method.toUpperCase(),
              path: argv.path,
              input: requestData,
            });

            console.log('Result:');
            console.log(JSON.stringify(result, null, 2));
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
    .demandCommand(1, 'You must specify a command (list or run)')
    .help()
    .alias('help', 'h')
    .example([
      ['$0 list', 'List all available endpoints'],
      ['$0 run /api/users', 'Run GET /api/users'],
      ['$0 run /api/users --method POST --name "John" --email "john@example.com"', 'Run POST with data'],
    ])
    .argv;
}

main();
