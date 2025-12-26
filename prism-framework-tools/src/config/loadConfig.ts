import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseFile } from '@facetlayer/qc';
import type { ConfigFile, GenerateApiClientTarget } from './ConfigFile.ts';

const CONFIG_FILENAME = '.prism.qc';

export function loadConfig(cwd: string): ConfigFile | null {
  const configPath = join(cwd, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return null;
  }

  const content = readFileSync(configPath, 'utf-8');
  const queries = parseFile(content);

  const generateApiClientTargets: GenerateApiClientTarget[] = [];

  for (const query of queries) {
    if (query.command === 'generate-api-client') {
      const outputFile = query.getStringValue('output-file');
      generateApiClientTargets.push({ outputFile });
    }
  }

  return {
    generateApiClientTargets,
  };
}
