import { existsSync, statSync } from 'fs';
import { join, resolve, dirname, parse } from 'path';

const CONFIG_FILE_NAME = '.claude-worktree.json';

/**
 * Finds the configuration file by searching up the directory tree.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Path to the config file, or null if not found
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = resolve(startDir);
  const rootDir = parse(currentDir).root;

  while (true) {
    const configPath = join(currentDir, CONFIG_FILE_NAME);

    try {
      if (existsSync(configPath) && statSync(configPath).isFile()) {
        return configPath;
      }
    } catch {
      // Continue searching if we can't access this directory
    }

    // If we've reached the filesystem root, stop searching
    if (currentDir === rootDir) {
      break;
    }

    // Move up one directory
    const parentDir = dirname(currentDir);

    // Safety check to prevent infinite loops
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}
