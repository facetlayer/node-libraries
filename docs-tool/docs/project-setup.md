---
name: project-setup
description: Instructions for adding docs-tool to your CLI application
---

# Project Setup

This guide explains how to add `@facetlayer/docs-tool` to your CLI application.

## Installation

```bash
pnpm add @facetlayer/docs-tool
```

## Setting Up the Doc Files Folder

Create a `docs` directory in your project root to store your documentation files:

```
my-project/
├── docs/
│   ├── getting-started.md
│   └── configuration.md
├── src/
│   └── cli.ts
└── package.json
```

Each doc file should include YAML frontmatter with `name` and `description`:

```markdown
---
name: getting-started
description: Quick start guide for new users
---

# Getting Started

Your markdown content here.
```

## Creating a DocFilesHelper Instance

In your CLI script (e.g., `src/cli.ts`), create a `DocFilesHelper` instance:

```typescript
import { DocFilesHelper } from '@facetlayer/docs-tool';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __packageRoot = join(__dirname, '..');

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],
  files: [join(__packageRoot, 'README.md')],
});
```

### Configuration Options

```typescript
interface DocFilesHelperOptions {
  // List of directories to search for *.md files
  dirs?: string[];

  // List of specific files to include
  files?: string[];

  // Override the subcommand name for getting a single doc (default: 'get-doc')
  overrideGetSubcommand?: string;
}
```

## Adding Commands to Yargs

There are two approaches depending on how your CLI is structured.

### Option 1: Using yargsSetup() with parse()

If your CLI uses yargs with `.parse()` and command handlers, call `yargsSetup()`:

```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DocFilesHelper } from '@facetlayer/docs-tool';

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],
});

async function main() {
  const args = yargs(hideBin(process.argv))
    .command(
      'my-command',
      'Description of my command',
      {},
      async () => {
        // Your command implementation
      }
    );

  // Add list-docs and get-doc commands
  docFiles.yargsSetup(args);

  args
    .strictCommands()
    .demandCommand(1, 'You must specify a command')
    .help()
    .parse();  // Must use parse(), not parseSync()
}

main();
```

**Important:** `yargsSetup()` registers async command handlers. You must use `.parse()` instead of `.parseSync()`, otherwise yargs will throw an error.

### Option 2: Manual registration with parseSync()

If your CLI uses `.parseSync()` with a switch statement to handle commands, register the commands manually for help text and handle them in your switch:

```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DocFilesHelper } from '@facetlayer/docs-tool';

const docFiles = new DocFilesHelper({
  dirs: [join(__packageRoot, 'docs')],
});

function configureYargs() {
  return yargs(hideBin(process.argv))
    .command('my-command', 'Description of my command', () => {})
    // Register doc commands for help text (no handlers)
    .command('list-docs', 'List available documentation files', () => {})
    .command('get-doc <name>', 'Display contents of a doc file', () => {})
    .help();
}

function main() {
  const argv = configureYargs().parseSync();
  const command = argv._[0] as string;
  const name = argv.name as string;

  switch (command) {
    case 'my-command':
      // handle my-command
      break;

    case 'list-docs':
      docFiles.printDocFileList();
      break;

    case 'get-doc':
      docFiles.printDocFileContents(name);
      break;
  }
}

main();
```

This adds two commands to your CLI:

- `<app> list-docs` - List all available doc files with descriptions
- `<app> get-doc <name>` - Display the contents of a specific doc file

## Manual Usage (Without Yargs)

If you're not using Yargs or want more control, use the helper methods directly:

```typescript
// List all docs
const docs = docFiles.listDocs();
// Returns: [{ name, description, filename }, ...]

// Get a specific doc
const doc = docFiles.getDoc('getting-started');
// Returns: { name, description, filename, content, rawContent, fullPath }

// Print formatted list to stdout
docFiles.printDocFileList();

// Print doc contents to stdout
docFiles.printDocFileContents('getting-started');
```
