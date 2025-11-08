#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as path from 'path';
import * as fs from 'fs';

interface RunEndpointOptions {
  path: string;
  method: string;
  services?: string;
  [key: string]: any;
}

/**
 * EndpointRunner - CLI tool for running endpoints locally without Express.js
 *
 * Dynamically imports the services file and framework types, then executes
 * endpoints directly without needing to start a full HTTP server.
 */
class EndpointRunner {
  handlerByPath = new Map<string, any>();

  constructor(services: any[]) {
    // Build a map of "METHOD /path" -> endpoint definition
    for (const service of services) {
      for (const endpoint of service.endpoints || []) {
        const fullPath = `${endpoint.method} ${endpoint.path}`;
        this.handlerByPath.set(fullPath, endpoint);
      }
    }
  }

  async runEndpoint(
    method: string,
    path: string,
    inputData: Record<string, any>,
    frameworkModule: any
  ): Promise<any> {
    const { v4: uuidv4 } = await import('uuid');

    // Create a request context similar to what Express would create
    const context = {
      requestId: uuidv4(),
      startTime: Date.now(),
      auth: new frameworkModule.Authorization(),
    };

    let response: Promise<any>;

    // Run the handler within the request context
    frameworkModule.withRequestContext(context, () => {
      response = this.runEndpointInContext(method, path, inputData);
    });

    return response!;
  }

  async runEndpointInContext(
    method: string,
    path: string,
    inputData: Record<string, any>
  ): Promise<any> {
    const fullPath = `${method} ${path}`;
    const endpoint = this.handlerByPath.get(fullPath);

    if (!endpoint) {
      const available = Array.from(this.handlerByPath.keys()).join('\n  ');
      throw new Error(
        `Endpoint not found: ${fullPath}\n\nAvailable endpoints:\n  ${available}`
      );
    }

    // Validate input schema if present
    if (endpoint.requestSchema) {
      const validationResult = endpoint.requestSchema.safeParse(inputData);
      if (!validationResult.success) {
        console.error('Schema validation failed:');
        console.error(JSON.stringify(validationResult.error.issues, null, 2));
        throw new Error(`Schema validation failed for ${fullPath}`);
      }
      inputData = validationResult.data;
    }

    // Execute the handler
    const result = await endpoint.handler(inputData);

    // Check for SSE responses (not supported in CLI)
    if (result?.startSse) {
      throw new Error('SSE responses are not supported by run-endpoint CLI tool');
    }

    // Validate output schema if present
    if (result && endpoint.responseSchema) {
      const validationResult = endpoint.responseSchema.safeParse(result);
      if (!validationResult.success) {
        console.warn(`Response schema validation failed for ${method} ${path}`);
        console.warn(JSON.stringify(validationResult.error.issues, null, 2));
      }
    }

    return result;
  }

  listEndpoints(): void {
    console.log('Available endpoints:\n');
    for (const [path, endpoint] of this.handlerByPath.entries()) {
      console.log(`  ${path}`);
      if (endpoint.description) {
        console.log(`    ${endpoint.description}`);
      }
    }
  }
}

/**
 * Resolves the services file path, handling both .ts and .js files
 */
function resolveServicesPath(servicesPath: string): string {
  const cwd = process.cwd();

  // If it's a relative path, resolve it from cwd
  const absolutePath = path.isAbsolute(servicesPath)
    ? servicesPath
    : path.resolve(cwd, servicesPath);

  // Try various extensions
  const extensions = ['.ts', '.js', '.mjs', '.cjs', ''];

  for (const ext of extensions) {
    const pathWithExt = ext ? absolutePath.replace(/\.(ts|js|mjs|cjs)?$/, ext) : absolutePath;
    if (fs.existsSync(pathWithExt)) {
      return pathWithExt;
    }
  }

  // If path exists as-is, use it (dynamic import will handle the error if it's invalid)
  return absolutePath;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('path', {
      type: 'string',
      description: 'Endpoint path (e.g., /api/users)',
      demandOption: false,
    })
    .option('method', {
      type: 'string',
      description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
      default: 'GET',
    })
    .option('services', {
      type: 'string',
      description: 'Path to services file that exports ALL_SERVICES (relative to cwd)',
      default: './src/services.ts',
    })
    .option('list', {
      type: 'boolean',
      description: 'List all available endpoints',
      default: false,
    })
    .help()
    .alias('help', 'h')
    .example([
      ['$0 --path /api/users --method GET', 'Run GET /api/users'],
      ['$0 --path /api/users --method POST --name "John" --email "john@example.com"', 'Run POST with data'],
      ['$0 --list', 'List all available endpoints'],
      ['$0 --services ./dist/services.js --path /health', 'Use compiled services file'],
    ])
    .argv as RunEndpointOptions;

  try {
    // Resolve and import the services file
    const servicesPath = resolveServicesPath(argv.services!);
    const servicesUrl = `file://${servicesPath}`;

    console.log(`Loading services from: ${servicesPath}`);
    const servicesModule = await import(servicesUrl);
    const ALL_SERVICES = servicesModule.ALL_SERVICES || servicesModule.default;

    if (!ALL_SERVICES || !Array.isArray(ALL_SERVICES)) {
      throw new Error(
        `Could not find ALL_SERVICES export in ${argv.services}. ` +
        'Make sure the module exports an array of ServiceDefinition objects.\n' +
        'Example: export const ALL_SERVICES = [...]'
      );
    }

    console.log(`Loaded ${ALL_SERVICES.length} service(s)\n`);

    // Import framework module for types and utilities
    const frameworkModule = await import('@facetlayer/prism-framework-api');

    const runner = new EndpointRunner(ALL_SERVICES);

    // Handle --list flag
    if (argv.list) {
      runner.listEndpoints();
      return;
    }

    // Require --path if not listing
    if (!argv.path) {
      console.error('Error: --path is required (or use --list to see available endpoints)');
      process.exit(1);
    }

    // Collect all other arguments as request body data
    const requestData: Record<string, any> = {};
    for (const [key, value] of Object.entries(argv)) {
      // Skip known options
      if (['path', 'method', 'services', 'list', '_', '$0'].includes(key)) {
        continue;
      }
      requestData[key] = value;
    }

    console.log(`Running: ${argv.method} ${argv.path}`);
    if (Object.keys(requestData).length > 0) {
      console.log('Request data:', JSON.stringify(requestData, null, 2));
    }
    console.log();

    const result = await runner.runEndpoint(
      argv.method.toUpperCase(),
      argv.path,
      requestData,
      frameworkModule
    );

    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
