import { config } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { z } from 'zod';

// Recursively find the nearest .env file
function findEnvFile(dir: string): string {
  const envFile = join(dir, '.env');
  if (existsSync(envFile)) {
    return envFile;
  }
  const parentDir = dirname(dir);
  if (parentDir === dir) {
    throw new Error('No .env file found');
  }
  return findEnvFile(parentDir);
}

config({
  quiet: true,
  path: findEnvFile(process.cwd()),
});

