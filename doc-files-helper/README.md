# @facetlayer/doc-files-helper

Helper library for CLI tools to share their doc files.

When an app uses this library, they'll typically have these commands:

 `<app> list-docs` - List all the doc files with descriptions.
 `<app> get-doc <name>` - Get the contents for a single doc file.

The `list-docs` and `get-doc` commands will browse through all the doc files that the
tool owns. These are typically stored in ./docs.

Each doc file should be Markdown and implement frontmatter with `name` and `description`
(same format that Claude Agent Skills uses). The name & description are shared when
doing `list-docs`.

## Installation

```bash
pnpm add @facetlayer/doc-files-helper
```

## Example

### Listing Docs

```typescript
import { DocFilesHelper } from '@facetlayer/doc-files-helper';

const helper = new DocFilesHelper({ dirs: ['./docs'] });
const docs = helper.listDocs();
// Returns: [{ name: 'my-doc', description: '...', filename: 'my-doc.md' }, ...]
```

### Getting a Doc

```typescript
import { DocFilesHelper } from '@facetlayer/doc-files-helper';

const helper = new DocFilesHelper({ dirs: ['./docs'] });
const doc = helper.getDoc('my-doc');
// Returns: { name, description, filename, content, rawContent, fullPath }
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
}
```

#### Methods

- `listDocs(): DocInfo[]` - Lists all `.md` files with their frontmatter metadata.
- `getDoc(name: string): DocContent` - Gets a specific doc file by name (without `.md` extension). Throws if not found.
- `printDocFileList(): void` - Prints a formatted list of all doc files to stdout.
- `printDocFileContents(name: string): void` - Prints the raw contents of a specific doc file to stdout.
