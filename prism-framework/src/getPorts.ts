import { getOrClaimPort } from '@facetlayer/port-assignment';

/**
 * Gets the port for a project directory using port-assignment.
 * @param options - Configuration options
 * @param options.dir - Project directory (defaults to current working directory)
 * @param options.name - Service name (defaults to "api")
 * @returns The port number
 */
export async function getPort(options?: { dir?: string; name?: string }): Promise<number> {
  const dir = options?.dir || process.cwd();
  const name = options?.name || 'api';

  return getOrClaimPort({ project_dir: dir, name });
}
