---
name: writing-doc-files
description: How to write and add documentation files for CLI tools
---

# Writing Doc Files

This guide explains how to write documentation files that work with `@facetlayer/docs-tool`.

## Doc File Format

Doc files are Markdown files with YAML frontmatter. The frontmatter provides metadata that's displayed when listing docs.

### Basic Structure

```markdown
---
name: my-doc-name
description: A brief description of what this doc covers
---

# Doc Title

Your markdown content here.
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Recommended | Short identifier for the doc (used in `get-doc` command) |
| `description` | Recommended | One-line description shown in `list-docs` output |

If `name` is not provided, the filename (without `.md`) is used as the name.

### Example Doc File

```markdown
---
name: configuration
description: How to configure the application settings
---

# Configuration Guide

## Environment Variables

The app reads the following environment variables:

- `API_KEY` - Your API key for authentication
- `DEBUG` - Set to "true" to enable debug logging

## Config File

Create a `config.json` in your project root:

\`\`\`json
{
  "timeout": 30,
  "retries": 3
}
\`\`\`
```

## Adding Docs to Your CLI

To ensure your doc files are available through the CLI, you need to:

1. **Create a docs directory** - Typically `./docs` in your project root

2. **Configure DocFilesHelper** - In your CLI script, create an instance pointing to your docs:

```typescript
import { DocFilesHelper } from '@facetlayer/docs-tool';

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],
  files: [join(__packageRoot, 'README.md')],  // Optional
});
```

3. **Verify the configuration** - Check that your docs are included by running:

```bash
# List all available docs
your-cli list-docs

# Verify a specific doc works
your-cli get-doc your-doc-name
```

## Troubleshooting

### Doc not showing in list-docs

1. **Check the file location** - Ensure the file is in a directory listed in `dirs` or explicitly in `files`

2. **Check the file extension** - Only `.md` files are included from directories

3. **Verify DocFilesHelper setup** - Look for where `DocFilesHelper` is instantiated in your CLI code:

```typescript
// Look for something like this in your cli.ts or main script:
const docFiles = new DocFilesHelper({
  dirs: [...],  // Your docs directory should be here
  files: [...], // Or specific files listed here
});
```

4. **Check path resolution** - Make sure paths are absolute. Use the `__packageRoot` pattern:

```typescript
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __packageRoot = join(__dirname, '..');

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],  // Absolute path
});
```

Relative paths like `'./docs'` will resolve from the current working directory, not your package root, which breaks when the CLI is run from different directories

### Doc content not displaying correctly

1. **Check frontmatter syntax** - Ensure the `---` delimiters are on their own lines
2. **Validate YAML** - Make sure frontmatter uses valid YAML (proper spacing, no tabs)

## Publishing Docs with Your Package

If you publish your CLI to npm, make sure to include the docs directory in your `package.json`:

```json
{
  "files": [
    "src",
    "dist",
    "docs",
    "README.md"
  ]
}
```

Without this, the docs folder won't be included when users install your package, and `list-docs` will show nothing.

## Best Practices

1. **Use descriptive names** - Choose names that are easy to type and remember
2. **Write clear descriptions** - The description appears in `list-docs` so make it helpful
3. **Keep docs focused** - One topic per doc file
4. **Include examples** - Show concrete usage examples in your docs
5. **Test your docs** - Run `list-docs` and `get-doc` after adding new files
6. **Include README.md** - Add your README to the `files` array so it shows in `list-docs`
