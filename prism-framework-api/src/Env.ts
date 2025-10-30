import { config } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { z } from 'zod';
import { EnvSchema, zEnvSchema } from './env/EnvSchema';

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


export function checkEnvVars(): void {
  try {
    const rawConfig = {
      sqliteDatabasePath: process.env.SQLITE_DATABASE_PATH,
      apiBaseUrl: process.env.API_BASE_URL,
      webBaseUrl: process.env.WEB_BASE_URL,
      logFilePath: process.env.LOG_FILE_PATH,
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
      enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === 'true',
      enableDesktopLocalAuth: process.env.ENABLE_DESKTOP_LOCAL_AUTH === 'true',
    };

    zEnvSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid config format: ${error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw new Error(
      `Failed to load config from environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function getEnv(): EnvSchema {
  return zEnvSchema.parse(process.env);
}