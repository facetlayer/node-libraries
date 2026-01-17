import { existsSync } from 'fs';
import { join } from 'path';
import { runShellCommand } from '@facetlayer/subprocess-wrapper';
import { packageExistsAt } from './browseNpmLibrary.ts';

export interface GlobalLibraryLocation {
  libraryPath: string;
  libraryName: string;
}

/**
 * Cached global npm prefix to avoid repeated shell calls
 */
let cachedGlobalPrefix: string | null | undefined = undefined;

/**
 * Get the global npm prefix directory.
 * Returns null if it cannot be determined.
 */
export async function getGlobalNpmPrefix(): Promise<string | null> {
  if (cachedGlobalPrefix !== undefined) {
    return cachedGlobalPrefix;
  }

  try {
    const result = await runShellCommand('npm', ['prefix', '-g']);
    if (result.failed() || !result.stdout) {
      cachedGlobalPrefix = null;
      return null;
    }
    cachedGlobalPrefix = result.stdout[0]?.trim() || null;
    return cachedGlobalPrefix;
  } catch {
    cachedGlobalPrefix = null;
    return null;
  }
}

/**
 * Find a library in the global npm installation directory.
 * This is where `npm install -g` puts packages.
 */
export async function findInGlobalNpmInstall(libraryName: string): Promise<GlobalLibraryLocation | null> {
  const globalPrefix = await getGlobalNpmPrefix();
  if (!globalPrefix) {
    return null;
  }

  const globalNodeModules = join(globalPrefix, 'lib', 'node_modules');
  if (!existsSync(globalNodeModules)) {
    return null;
  }

  // Handle scoped packages like @scope/package
  if (libraryName.startsWith('@')) {
    const [scope, pkgName] = libraryName.split('/');
    if (pkgName) {
      const fullPath = join(globalNodeModules, scope, pkgName);
      if (packageExistsAt(fullPath)) {
        return {
          libraryPath: fullPath,
          libraryName: libraryName,
        };
      }
    }
    return null;
  }

  // Regular package
  const fullPath = join(globalNodeModules, libraryName);
  if (packageExistsAt(fullPath)) {
    return {
      libraryPath: fullPath,
      libraryName: libraryName,
    };
  }

  return null;
}
