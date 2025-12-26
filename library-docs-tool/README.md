# @facetlayer/library-docs-tool

CLI tool to find and display documentation files for npm libraries.

## Installation

```bash
npm install -g @facetlayer/library-docs-tool
```

## Usage

### List documentation files

```bash
library-docs list-docs <library-name>
```

Example:
```bash
library-docs list-docs lodash
library-docs list-docs react
library-docs list-docs @facetlayer/doc-files-helper
```

### Get a specific doc file

```bash
library-docs get-doc <library-name> [doc-name]
```

If `doc-name` is not specified, it defaults to README.

Examples:
```bash
library-docs get-doc lodash
library-docs get-doc lodash README
library-docs get-doc typescript contributing
```

### Find a library location

```bash
library-docs find <library-name>
```

Options:
- `--no-install`: Don't install the library if not found locally

## How It Works

### Library Resolution

The tool searches for libraries in this order:

1. **Exact match in local node_modules** - Current directory's node_modules
2. **Exact match in parent node_modules** - Walk up the directory tree
3. **Partial match in local node_modules** - Fuzzy matching in current directory
4. **Partial match in parent node_modules** - Fuzzy matching in parent directories

### Automatic Installation

If a library is not found in any node_modules directory, the tool will:

1. Check if it's already installed in the tool's cache directory (`~/.local/state/library-docs-tool/installed-packages/`)
2. If found in cache, check if a newer version is available and update if needed
3. If not found, install it using pnpm (without running install scripts for safety)

### Documentation Discovery

For each library, the tool looks for:

- `README.md` in the library root
- `docs/` folder containing markdown files

These are then made available through the `list-docs` and `get-doc` commands.

## Programmatic Usage

```typescript
import { getDocsForLibrary, findLibrary, findLibraryInNodeModules } from '@facetlayer/library-docs-tool';

// Get docs helper for a library
const docs = getDocsForLibrary('lodash');
if (docs) {
  console.log(docs.libraryName);
  console.log(docs.libraryPath);
  docs.helper.printDocFileList();
}

// Just find a library without getting docs
const location = findLibrary('react');
if (location) {
  console.log(location.libraryPath);
}

// Find in node_modules only (no auto-install)
const local = findLibraryInNodeModules('express');
```

## Dependencies

- [@facetlayer/doc-files-helper](https://www.npmjs.com/package/@facetlayer/doc-files-helper) - For parsing and displaying documentation files
- [@facetlayer/userdata-db](https://www.npmjs.com/package/@facetlayer/userdata-db) - For managing the cache directory

## License

MIT
