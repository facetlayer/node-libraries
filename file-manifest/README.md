
# @facetlayer/file-manifest

Uses a rule-based approach to synchronize a set of files from one location to another.

Supports local and remote destinations.

# Rules config

When reading or writing files with a manifest, the operation is controlled by a 'rules config'

This file contains the following rules:

### include

```
    include src;
```

Includes the file or directory in the sync (including all nested files)

### exclude

```
    exclude .git
```

Excludes the file or directory in the sync.

### ignore-destination

When syncing to a destination folder, the default behavior is to delete any extra
files or folders that weren't part of the latest manifest.

If there are files or folders that you don't want to delete, then you can use `ignore-destination`
to specify paths that shouldn't be deleted.

```
    ignore-destination dest
```


# API

### resolveFileList

```typescript
async function resolveFileList(sourceDir: string, ruleConfig: string | FileMatchRule[]): Promise<Table<FileEntry>>
```

Takes a source directory and rules configuration, returns a table of files that match the include/exclude rules.

**Parameters:**
- `sourceDir` - Path to the source directory to scan
- `ruleConfig` - Either a string containing rules config or an array of `FileMatchRule` objects

**Returns:** A table containing `FileEntry` objects with properties:
- `id` - Auto-generated unique identifier
- `relPath` - Relative path from source directory
- `sourcePath` - Full absolute path to the source file

**Example:**
```typescript
const files = await resolveFileList('/path/to/source', `
    include src
    include docs
    exclude src/build
    exclude .git
`);

// List all matching files
for (const file of files.listAll()) {
    console.log(`${file.relPath} -> ${file.sourcePath}`);
}
```

The function recursively scans the source directory and applies include/exclude rules:
- Files/directories must match an `include` rule to be included
- Files/directories matching an `exclude` rule are excluded even if they match an include rule
- When a directory is included, all its contents are included unless explicitly excluded

### findLeftoverFiles

```typescript
async function findLeftoverFiles(targetDir: string, incomingFiles: Table<FileEntry>, ruleConfig: FileMatchRule[]): Promise<Table<FileEntry>>
```

Scans a target directory to find files that exist in the target but are not part of the incoming file set. This is useful for identifying files that would be "leftover" after a sync operation.

**Parameters:**
- `targetDir` - Path to the target directory to scan
- `incomingFiles` - Table of files that will be synced to the target
- `ruleConfig` - Array of `FileMatchRule` objects (used for ignore-destination rules)

**Returns:** A table containing `FileEntry` objects for files found in target but not in incoming files

**Example:**
```typescript
const sourceFiles = await resolveFileList('/source', rulesConfig);
const leftovers = await findLeftoverFiles('/target', sourceFiles, parsedRules);

if (leftovers.listAll().length > 0) {
    console.log('Files that will be removed:');
    for (const file of leftovers.listAll()) {
        console.log(`  ${file.relPath}`);
    }
}
```

The function respects `ignore-destination` rules - files matching these rules will not be considered leftovers and won't be deleted during sync operations.

### parseRulesFile

```typescript
function parseRulesFile(ruleConfig: string): FileMatchRule[]
```

Parses a rules configuration string and returns an array of `FileMatchRule` objects.

**Parameters:**
- `ruleConfig` - String containing rules configuration

**Returns:** Array of `FileMatchRule` objects

**Example:**
```typescript
import { parseRulesFile } from '@facetlayer/file-manifest';

const rules = parseRulesFile(`
    include src
    include docs
    exclude src/build
    ignore-destination temp
`);
// Returns: [
//   { type: RuleType.Include, pattern: 'src' },
//   { type: RuleType.Include, pattern: 'docs' },
//   { type: RuleType.Exclude, pattern: 'src/build' },
//   { type: RuleType.IgnoreDestination, pattern: 'temp' }
// ]
```

### FileMatchRule Types

The library uses the following types and enum for rule matching:

```typescript
enum RuleType {
    Include = 'include',
    Exclude = 'exclude',
    IgnoreDestination = 'ignore-destination'
}

interface IncludeRule {
    type: RuleType.Include;
    pattern: string;
}

interface ExcludeRule {
    type: RuleType.Exclude;
    pattern: string;
}

interface IgnoreDestinationRule {
    type: RuleType.IgnoreDestination;
    pattern: string;
}

type FileMatchRule = IncludeRule | ExcludeRule | IgnoreDestinationRule;
```

These types allow for type-safe rule handling without depending on the @facetlayer/query library directly. The `RuleType` enum provides compile-time safety and better IDE support.
