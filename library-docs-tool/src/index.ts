import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { DocFilesHelper } from '@facetlayer/doc-files-helper';
import { getOrCreateStateDirectory } from '@facetlayer/userdata-db';

const APP_NAME = 'library-docs-tool';

export interface LibraryLocation {
  libraryPath: string;
  libraryName: string;
  matchType: 'exact' | 'partial';
}

export interface LibraryDocs {
  libraryName: string;
  libraryPath: string;
  helper: DocFilesHelper;
  hasReadme: boolean;
  hasDocsFolder: boolean;
}

/**
 * Check if a directory contains a package that matches the given name exactly
 */
function findExactMatch(nodeModulesPath: string, libraryName: string): string | null {
  // Handle scoped packages like @scope/package
  if (libraryName.startsWith('@')) {
    const [scope, pkgName] = libraryName.split('/');
    const scopePath = join(nodeModulesPath, scope);
    if (pkgName && existsSync(scopePath)) {
      const fullPath = join(scopePath, pkgName);
      if (existsSync(fullPath) && existsSync(join(fullPath, 'package.json'))) {
        return fullPath;
      }
    }
    return null;
  }

  // Regular package
  const fullPath = join(nodeModulesPath, libraryName);
  if (existsSync(fullPath) && existsSync(join(fullPath, 'package.json'))) {
    return fullPath;
  }
  return null;
}

/**
 * Find packages that partially match the given name
 */
function findPartialMatches(nodeModulesPath: string, partialName: string): LibraryLocation[] {
  const matches: LibraryLocation[] = [];
  const lowerPartial = partialName.toLowerCase();

  if (!existsSync(nodeModulesPath)) {
    return matches;
  }

  const entries = readdirSync(nodeModulesPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Handle scoped packages
    if (entry.name.startsWith('@')) {
      const scopePath = join(nodeModulesPath, entry.name);
      const scopedEntries = readdirSync(scopePath, { withFileTypes: true });
      for (const scopedEntry of scopedEntries) {
        if (!scopedEntry.isDirectory()) continue;
        const fullName = `${entry.name}/${scopedEntry.name}`;
        if (fullName.toLowerCase().includes(lowerPartial)) {
          const fullPath = join(scopePath, scopedEntry.name);
          if (existsSync(join(fullPath, 'package.json'))) {
            matches.push({
              libraryPath: fullPath,
              libraryName: fullName,
              matchType: 'partial',
            });
          }
        }
      }
    } else {
      // Regular package
      if (entry.name.toLowerCase().includes(lowerPartial)) {
        const fullPath = join(nodeModulesPath, entry.name);
        if (existsSync(join(fullPath, 'package.json'))) {
          matches.push({
            libraryPath: fullPath,
            libraryName: entry.name,
            matchType: 'partial',
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Get all node_modules directories from current directory up to root
 */
function getNodeModulesPaths(startDir: string): string[] {
  const paths: string[] = [];
  let currentDir = startDir;

  while (true) {
    const nodeModulesPath = join(currentDir, 'node_modules');
    if (existsSync(nodeModulesPath)) {
      paths.push(nodeModulesPath);
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root
      break;
    }
    currentDir = parentDir;
  }

  return paths;
}

/**
 * Find a library by name in node_modules directories.
 *
 * Search order:
 * 1. Exact match in current directory's node_modules
 * 2. Exact match in parent directories' node_modules
 * 3. Partial match in current directory's node_modules
 * 4. Partial match in parent directories' node_modules
 */
export function findLibraryInNodeModules(libraryName: string, startDir?: string): LibraryLocation | null {
  const cwd = startDir || process.cwd();
  const nodeModulesPaths = getNodeModulesPaths(cwd);

  // Phase 1: Try exact match in all directories first
  for (const nodeModulesPath of nodeModulesPaths) {
    const exactPath = findExactMatch(nodeModulesPath, libraryName);
    if (exactPath) {
      return {
        libraryPath: exactPath,
        libraryName: libraryName,
        matchType: 'exact',
      };
    }
  }

  // Phase 2: Try partial match in all directories
  for (const nodeModulesPath of nodeModulesPaths) {
    const partialMatches = findPartialMatches(nodeModulesPath, libraryName);
    if (partialMatches.length === 1) {
      return partialMatches[0];
    }
    if (partialMatches.length > 1) {
      // Multiple matches - return the first one but log a warning
      console.warn(`Multiple partial matches found for "${libraryName}":`);
      for (const match of partialMatches) {
        console.warn(`  - ${match.libraryName}`);
      }
      console.warn(`Using: ${partialMatches[0].libraryName}`);
      return partialMatches[0];
    }
  }

  return null;
}

/**
 * Get the installation directory for libraries that aren't found in node_modules
 */
export function getInstallationDirectory(): string {
  const stateDir = getOrCreateStateDirectory(APP_NAME);
  const installDir = join(stateDir, 'installed-packages');

  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true });
  }

  return installDir;
}

/**
 * Initialize the installation directory with a package.json if needed
 */
function ensureInstallDirInitialized(installDir: string): void {
  const packageJsonPath = join(installDir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    const packageJson = {
      name: 'library-docs-installed-packages',
      version: '1.0.0',
      private: true,
      description: 'Packages installed by library-docs-tool for documentation viewing',
    };
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
}

/**
 * Check if a library is installed in our installation directory
 */
function findInInstallDir(installDir: string, libraryName: string): LibraryLocation | null {
  const nodeModulesPath = join(installDir, 'node_modules');

  if (!existsSync(nodeModulesPath)) {
    return null;
  }

  // Try exact match first
  const exactPath = findExactMatch(nodeModulesPath, libraryName);
  if (exactPath) {
    return {
      libraryPath: exactPath,
      libraryName: libraryName,
      matchType: 'exact',
    };
  }

  // Try partial match
  const partialMatches = findPartialMatches(nodeModulesPath, libraryName);
  if (partialMatches.length >= 1) {
    return partialMatches[0];
  }

  return null;
}

/**
 * Get the latest version of a package from npm registry
 */
function getLatestVersion(libraryName: string): string | null {
  try {
    const result = execSync(`npm view "${libraryName}" version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Get the installed version of a package
 */
function getInstalledVersion(libraryPath: string): string | null {
  try {
    const packageJsonPath = join(libraryPath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || null;
  } catch {
    return null;
  }
}

/**
 * Install a library using pnpm (without running install scripts)
 */
function installLibrary(installDir: string, libraryName: string): void {
  ensureInstallDirInitialized(installDir);

  console.log(`Installing ${libraryName}...`);

  try {
    execSync(`pnpm add "${libraryName}" --ignore-scripts`, {
      cwd: installDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`Successfully installed ${libraryName}`);
  } catch (error: any) {
    throw new Error(`Failed to install ${libraryName}: ${error.message}`);
  }
}

/**
 * Update a library to the latest version
 */
function updateLibrary(installDir: string, libraryName: string): void {
  console.log(`Updating ${libraryName} to latest version...`);

  try {
    execSync(`pnpm update "${libraryName}" --ignore-scripts`, {
      cwd: installDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`Successfully updated ${libraryName}`);
  } catch (error: any) {
    console.warn(`Warning: Failed to update ${libraryName}: ${error.message}`);
  }
}

/**
 * Find a library, installing it if necessary
 */
export function findLibrary(libraryName: string, options?: { skipInstall?: boolean }): LibraryLocation | null {
  // First, try to find in local node_modules
  const localResult = findLibraryInNodeModules(libraryName);
  if (localResult) {
    return localResult;
  }

  if (options?.skipInstall) {
    return null;
  }

  // Check our installation directory
  const installDir = getInstallationDirectory();
  let installedResult = findInInstallDir(installDir, libraryName);

  if (installedResult) {
    // Check if we need to update to a newer version
    const installedVersion = getInstalledVersion(installedResult.libraryPath);
    const latestVersion = getLatestVersion(installedResult.libraryName);

    if (installedVersion && latestVersion && installedVersion !== latestVersion) {
      console.log(`Found ${installedResult.libraryName}@${installedVersion}, latest is ${latestVersion}`);
      updateLibrary(installDir, installedResult.libraryName);
      // Re-find after update
      installedResult = findInInstallDir(installDir, libraryName);
    }

    return installedResult;
  }

  // Not found anywhere - install it
  installLibrary(installDir, libraryName);

  // Find it after installation
  return findInInstallDir(installDir, libraryName);
}

/**
 * Create a DocFilesHelper for a library's documentation
 */
export function getLibraryDocs(libraryPath: string, libraryName: string): LibraryDocs {
  const dirs: string[] = [];
  const files: string[] = [];

  const readmePath = join(libraryPath, 'README.md');
  const docsPath = join(libraryPath, 'docs');

  const hasReadme = existsSync(readmePath);
  const hasDocsFolder = existsSync(docsPath);

  if (hasReadme) {
    files.push(readmePath);
  }

  if (hasDocsFolder) {
    dirs.push(docsPath);
  }

  const helper = new DocFilesHelper({ dirs, files });

  return {
    libraryName,
    libraryPath,
    helper,
    hasReadme,
    hasDocsFolder,
  };
}

/**
 * Main function to find a library and get its documentation helper
 */
export function getDocsForLibrary(libraryName: string, options?: { skipInstall?: boolean }): LibraryDocs | null {
  const location = findLibrary(libraryName, options);

  if (!location) {
    return null;
  }

  return getLibraryDocs(location.libraryPath, location.libraryName);
}
