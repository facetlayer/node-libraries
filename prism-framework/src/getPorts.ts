import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Finds and reads the .env file for a directory
 * Searches in the directory itself, then checks parent directories
 * @param dir - Directory to search from
 * @returns Parsed environment variables
 */
function loadEnvFile(dir: string): Record<string, string> {
  // First, check if there's a .env file directly in the provided directory
  let envPath = path.join(dir, '.env');

  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    return envConfig;
  }

  throw new Error(`Environment file not found. Searched: ${dir}/.env`);
}

/**
 * Gets the port from a directory's .env file
 * @param options - Configuration options
 * @param options.dir - Directory to search for .env file (defaults to current working directory)
 * @returns The port number
 */
export function getPort(options?: { dir?: string }): number {
  const dir = options?.dir || process.cwd();
  const env = loadEnvFile(dir);

  if (env.PORT) {
    return parseInt(env.PORT, 10);
  }

  throw new Error('Unable to determine port from .env file');
}

