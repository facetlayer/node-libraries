import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { parseFile } from '@facetlayer/qc';
import type { ConfigFile, GenerateApiClientTarget } from './ConfigFile.ts';

const CONFIG_FILENAME = '.prism.qc';

export interface LoadConfigResult {
  config: ConfigFile;
  configDir: string;
}

/**
 * Find and load the .prism.qc config file.
 * Searches in the provided directory and parent directories until found or root is reached.
 */
export function loadConfig(cwd: string): LoadConfigResult | null {
  let currentDir = resolve(cwd);

  while (true) {
    const configPath = join(currentDir, CONFIG_FILENAME);

    if (existsSync(configPath)) {
      const config = parseConfigFile(configPath);
      return { config, configDir: currentDir };
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root directory
      return null;
    }
    currentDir = parentDir;
  }
}

function parseConfigFile(configPath: string): ConfigFile {
  const content = readFileSync(configPath, 'utf-8');
  const queries = parseFile(content);

  const generateApiClientTargets: GenerateApiClientTarget[] = [];

  for (const query of queries) {
    switch (query.command) {
      case 'generate-api-client': {
        const outputFile = query.getStringValue('output-file');
        generateApiClientTargets.push({ outputFile });
        break;
      }
      default:
        throw new Error(`Unknown command "${query.command}" in ${CONFIG_FILENAME}`);
    }
  }

  return {
    generateApiClientTargets,
  };
}
