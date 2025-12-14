# @facetlayer/lsp-dev-tools

CLI tool using TypeScript language services for code analysis tasks.

## Installation

```bash
pnpm add -D @facetlayer/lsp-dev-tools
```

## Commands

### find-unused

Find exported symbols that are not used anywhere in the project.

```bash
lsp-dev-tools find-unused [path]
```

Options:
- `path` - Path to the project directory (must contain tsconfig.json). Defaults to current directory.
- `--json, -j` - Output results as JSON
- `--include-private` - Also check non-exported symbols

Example output:
```
Found 3 unused exported symbol(s):

  src/utils.ts:15:1 - function 'deprecatedHelper'
  src/types.ts:42:1 - interface 'LegacyConfig'
  src/constants.ts:8:1 - variable 'OLD_DEFAULT'
```

## Programmatic Usage

```typescript
import { findUnusedSymbols } from '@facetlayer/lsp-dev-tools';

const unused = findUnusedSymbols({
  projectPath: '/path/to/project',
});

for (const symbol of unused) {
  console.log(`${symbol.filePath}:${symbol.line} - ${symbol.kind} '${symbol.name}'`);
}
```

## License

MIT
