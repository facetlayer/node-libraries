import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { runShellCommand } from '@facetlayer/subprocess-wrapper';
import { DocFilesHelper } from './index.ts';

export interface LibraryLocation {
  libraryPath: string;
  libraryName: string;
  matchType: 'exact' | 'partial';
}

export interface NpmLibraryDocs {
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
  const stateDir = join(homedir(), '.cache', 'docs-tool');
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
      name: 'docs-tool-installed-packages',
      version: '1.0.0',
      private: true,
      description: 'Packages installed by docs-tool for documentation viewing',
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

  const exactPath = findExactMatch(nodeModulesPath, libraryName);
  if (exactPath) {
    return {
      libraryPath: exactPath,
      libraryName: libraryName,
      matchType: 'exact',
    };
  }

  const partialMatches = findPartialMatches(nodeModulesPath, libraryName);
  if (partialMatches.length >= 1) {
    return partialMatches[0];
  }

  return null;
}

/**
 * Get the latest version of a package from npm registry
 */
async function getLatestVersion(libraryName: string): Promise<string | null> {
  try {
    const result = await runShellCommand('npm', ['view', libraryName, 'version']);
    if (result.failed() || !result.stdout) {
      return null;
    }
    return result.stdout[0]?.trim() || null;
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
 * Install a library using npm (without running install scripts)
 */
async function installLibrary(installDir: string, libraryName: string): Promise<void> {
  ensureInstallDirInitialized(installDir);

  console.log(`Installing ${libraryName}...`);

  const result = await runShellCommand('npm', ['install', libraryName, '--ignore-scripts'], {
    cwd: installDir,
  });

  if (result.failed()) {
    throw new Error(`Failed to install ${libraryName}: ${result.stderrAsString()}`);
  }
  console.log(`Successfully installed ${libraryName}`);
}

/**
 * Update a library to the latest version
 */
async function updateLibrary(installDir: string, libraryName: string): Promise<void> {
  console.log(`Updating ${libraryName} to latest version...`);

  const result = await runShellCommand('npm', ['update', libraryName, '--ignore-scripts'], {
    cwd: installDir,
  });

  if (result.failed()) {
    console.warn(`Warning: Failed to update ${libraryName}: ${result.stderrAsString()}`);
  } else {
    console.log(`Successfully updated ${libraryName}`);
  }
}

/**
 * Find a library, installing it if necessary
 */
export async function findLibrary(libraryName: string, options?: { skipInstall?: boolean }): Promise<LibraryLocation | null> {
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
    const latestVersion = await getLatestVersion(installedResult.libraryName);

    if (installedVersion && latestVersion && installedVersion !== latestVersion) {
      console.log(`Found ${installedResult.libraryName}@${installedVersion}, latest is ${latestVersion}`);
      await updateLibrary(installDir, installedResult.libraryName);
      installedResult = findInInstallDir(installDir, libraryName);
    }

    return installedResult;
  }

  // Not found anywhere - install it
  await installLibrary(installDir, libraryName);

  return findInInstallDir(installDir, libraryName);
}

/**
 * Create a DocFilesHelper for a library's documentation
 */
export function getLibraryDocs(libraryPath: string, libraryName: string): NpmLibraryDocs {
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

  const helper = new DocFilesHelper({
    dirs,
    files,
    overrideGetSubcommand: `show ${libraryName}`,
  });

  return {
    libraryName,
    libraryPath,
    helper,
    hasReadme,
    hasDocsFolder,
  };
}

/**
 * Browse an NPM library's documentation.
 * First checks local node_modules, then installs from npm if not found.
 */
export async function browseNpmLibrary(libraryName: string, options?: { skipInstall?: boolean }): Promise<NpmLibraryDocs | null> {
  const location = await findLibrary(libraryName, options);

  if (!location) {
    return null;
  }

  return getLibraryDocs(location.libraryPath, location.libraryName);
}
