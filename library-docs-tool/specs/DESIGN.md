# library-docs-tool Design Specification

## Overview

`library-docs-tool` is a CLI tool that finds and displays documentation files for npm libraries. It accepts partial/fuzzy library names and can automatically install libraries that aren't found locally.

## Requirements

### Core Functionality

1. **Find documentation for any npm library** - Given a library name (full or partial), locate the library and display its documentation files.

2. **Support fuzzy/partial matching** - Users should be able to provide just part of a library name (e.g., "lodash" instead of the full package name).

3. **Use @facetlayer/doc-files-helper** - The tool must use this library to parse and display documentation files with frontmatter support.

### CLI Commands

The tool provides three commands:

1. **`list-docs <library>`** - List all available documentation files for a library
2. **`get-doc <library> [doc-name]`** - Display the contents of a specific doc file (defaults to README)
3. **`find <library>`** - Find a library and show its location without displaying docs

## Library Resolution Logic

The tool searches for libraries in a specific order, with exact matching taking priority over partial matching, and local directories taking priority over parent directories.

### Phase 1: Exact Matching

1. Check `./node_modules/<library-name>` in the current directory
2. Check `node_modules/<library-name>` in each parent directory, walking up to the root

For scoped packages (e.g., `@scope/package`), the tool correctly handles the nested directory structure.

### Phase 2: Partial Matching

If no exact match is found:

1. Check `./node_modules/` in the current directory for packages containing the partial name
2. Check `node_modules/` in each parent directory for partial matches

Partial matching:
- Is case-insensitive
- Matches anywhere in the package name (including scope for scoped packages)
- If multiple matches are found, uses the first match and logs a warning listing all matches

### Phase 3: Automatic Installation

If the library is not found in any local `node_modules`:

1. Check the tool's cache directory (`~/.local/state/library-docs-tool/installed-packages/`)
2. If found in cache:
   - Check if a newer version is available on npm
   - If newer version exists, update the package before using
3. If not found in cache:
   - Install the package using pnpm with `--ignore-scripts` flag (for security)
   - The `--ignore-scripts` flag prevents post-install scripts from running

The cache directory is managed using `@facetlayer/userdata-db`'s `getOrCreateStateDirectory` function, which follows XDG Base Directory standards.

## Documentation Discovery

For each library found, the tool looks for documentation in two locations:

### README.md

- Check for `README.md` in the library's root directory
- If it exists, include it in the list of available docs

### docs/ Folder

- Check for a `docs/` folder in the library's root directory
- If it exists, scan for all `.md` files within
- Each markdown file can have YAML frontmatter with `name` and `description` fields

### No Documentation

If neither README.md nor docs/ folder exists, this is **not an error**. The tool will report that no documentation was found for the library.

## Technical Details

### Directory Structure

```
~/.local/state/library-docs-tool/
└── installed-packages/
    ├── package.json          # Auto-generated, marks as private
    └── node_modules/         # Installed packages for documentation viewing
        └── <packages...>
```

### Package Installation

When installing packages:
- Uses `pnpm add "<package>" --ignore-scripts`
- Creates a minimal `package.json` if not present
- Packages are installed only for documentation viewing purposes

### Version Checking

When a package is found in the cache:
- Runs `npm view "<package>" version` to get the latest version
- Compares with the installed version from `package.json`
- If versions differ, runs `pnpm update "<package>" --ignore-scripts`

## Programmatic API

The tool exports several functions for programmatic use:

```typescript
// Find a library and get its docs helper
getDocsForLibrary(libraryName: string, options?: { skipInstall?: boolean }): LibraryDocs | null

// Find a library location (with optional auto-install)
findLibrary(libraryName: string, options?: { skipInstall?: boolean }): LibraryLocation | null

// Find only in local node_modules (no installation)
findLibraryInNodeModules(libraryName: string, startDir?: string): LibraryLocation | null

// Create a docs helper for a known library path
getLibraryDocs(libraryPath: string, libraryName: string): LibraryDocs

// Get the installation directory path
getInstallationDirectory(): string
```

### Types

```typescript
interface LibraryLocation {
  libraryPath: string;      // Full path to the library
  libraryName: string;      // Resolved library name
  matchType: 'exact' | 'partial';
}

interface LibraryDocs {
  libraryName: string;
  libraryPath: string;
  helper: DocFilesHelper;   // From @facetlayer/doc-files-helper
  hasReadme: boolean;
  hasDocsFolder: boolean;
}
```

## Security Considerations

1. **No post-install scripts** - When installing packages, `--ignore-scripts` is always used to prevent arbitrary code execution
2. **Read-only operations** - The tool only reads documentation files; it never modifies the target library
3. **Isolated cache** - Installed packages are kept in a separate directory, not mixed with project dependencies

## Dependencies

- `@facetlayer/doc-files-helper` - For parsing and displaying documentation files
- `@facetlayer/userdata-db` - For managing the cache directory following XDG standards
- `yargs` - For CLI argument parsing
