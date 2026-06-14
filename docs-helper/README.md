# @facetlayer/docs-helper

Helper library for CLI tools to share their doc files.

When an app uses this library, they'll typically add these commands:

 `<app> list-docs` - List all the doc files with descriptions.
 `<app> get-doc <name>` - Get the contents for a single doc file.

The `list-docs` and `get-doc` commands browse through all the doc files that the
tool owns. These are typically stored in ./docs.

Each doc file should be Markdown and implement frontmatter with `name` and `description`
(same format that Claude Agent Skills uses). The name & description are shown when
doing `list-docs`.

> Looking for a standalone CLI to browse docs in *any* local directory or installed
> NPM package? See [`@facetlayer/docs-tool`](https://github.com/facetlayer/node-libraries),
> which is built on top of this library.

## Installation

```bash
pnpm add @facetlayer/docs-helper
```

## Example

### Listing Docs

```typescript
import { DocFilesHelper } from '@facetlayer/docs-helper';

const helper = new DocFilesHelper({ dirs: ['./docs'] });
const docs = helper.listDocs();
// Returns: [{ name: 'my-doc', description: '...', filename: 'my-doc.md' }, ...]
```

### Getting a Doc

```typescript
import { DocFilesHelper } from '@facetlayer/docs-helper';

const helper = new DocFilesHelper({ dirs: ['./docs'] });
const doc = helper.getDoc('my-doc');
// Returns: { name, description, filename, content, rawContent, fullPath }
```

### Wiring into a yargs CLI

```typescript
import { DocFilesHelper } from '@facetlayer/docs-helper';

const helper = new DocFilesHelper({ dirs: ['./docs'] });

// Adds `list-docs` and `get-doc <name>` commands.
helper.yargsSetup(yargs);
```

## Frontmatter Format

Doc files should have YAML frontmatter at the start:

```markdown
---
name: doc-name
description: Brief description of the doc
---

# Doc Content

Your markdown content here.
```

## API

### `DocFilesHelper`

Helper class for working with doc files.

#### Constructor Options

```typescript
interface DocFilesHelperOptions {
  dirs?: string[];   // List of directories to search for .md files
  files?: string[];  // List of specific files to include
  overrideGetSubcommand?: string;  // Override the subcommand shown in printed hints (default: 'show')
}
```

#### Methods

- `listDocs(): DocInfo[]` - Lists all `.md` files with their frontmatter metadata.
- `getDoc(name: string): DocContent` - Gets a specific doc file by name (without `.md` extension). Throws if not found.
- `searchDocs(term, contextLines?): ...[]` - Searches all doc files for a term, returning matches with surrounding context.
- `printDocFileList(): void` - Prints a formatted list of all doc files to stdout.
- `printDocFileContents(name: string): void` - Prints the raw contents of a specific doc file to stdout.
- `printSearchResults(term, contextLines?): void` - Prints search results to stdout.
- `yargsSetup(yargs): void` - Registers `list-docs` and `get-doc <name>` commands on a yargs instance.

### `parseFrontmatter(text: string): ParsedDocument`

Parses YAML-style frontmatter from a markdown string.
