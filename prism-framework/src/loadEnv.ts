import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

export interface EnvConfig {
  port: number;
  baseUrl: string;
}

/**
 * Load and parse the .env file from the project directory
 * @param cwd - Current working directory to search from
 * @returns Configuration object with port and baseUrl
 * @throws Error if .env file is missing or PRISM_API_PORT is not defined
 */
export function loadEnv(cwd: string): EnvConfig {
  const envPath = path.resolve(cwd, '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(
      `No .env file found at ${envPath}\n\n` +
      'Please create a .env file with PRISM_API_PORT defined.\n' +
      'Example:\n' +
      '  PRISM_API_PORT=3000'
    );
  }

  // Load the .env file
  const result = config({ path: envPath });

  if (result.error) {
    throw new Error(`Failed to load .env file: ${result.error.message}`);
  }

  const port = process.env.PRISM_API_PORT;

  if (!port) {
    throw new Error(
      'PRISM_API_PORT is not defined in .env file\n\n' +
      'Please add PRISM_API_PORT to your .env file.\n' +
      'Example:\n' +
      '  PRISM_API_PORT=3000'
    );
  }

  const portNumber = parseInt(port, 10);

  if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
    throw new Error(
      `Invalid PRISM_API_PORT value: ${port}\n\n` +
      'Port must be a number between 1 and 65535'
    );
  }

  return {
    port: portNumber,
    baseUrl: `http://localhost:${portNumber}`,
  };
}
