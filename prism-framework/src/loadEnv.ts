import { getOrClaimPort } from '@facetlayer/port-assignment';

export interface EnvConfig {
  port: number;
  baseUrl: string;
}

/**
 * Load the port configuration for a Prism project.
 * Uses port-assignment to find or claim a port associated with this project directory.
 * @param cwd - Project directory
 * @returns Configuration object with port and baseUrl
 */
export async function loadEnv(cwd: string): Promise<EnvConfig> {
  const port = await getOrClaimPort({
    project_dir: cwd,
    name: 'api',
  });

  return {
    port,
    baseUrl: `http://localhost:${port}`,
  };
}
