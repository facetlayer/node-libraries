# lsp-dev-tools Functional Requirements

## Overview

A CLI tool that uses TypeScript language services (LSP) to perform various code analysis tasks.

## General CLI Requirements

- Use Yargs for CLI argument parsing
- Organize code so that additional commands can be easily added later
- Print an error message if the command is unrecognized, showing available commands

## Commands

### find-unused

Find exported symbols that are not used anywhere in the project.

#### Input

- Path to a project directory containing a `tsconfig.json` file (defaults to current directory)

#### Output

- List of unused exported symbols with:
  - File path (relative to project root)
  - Line and column number
  - Symbol kind (function, class, interface, type, enum, variable, etc.)
  - Symbol name
  - Reason category:
    - `no-references`: Symbol has no references at all (truly unused)
    - `internal-only`: Symbol is only used within the same file (unnecessary export)

- For `internal-only` symbols, the output includes the message: "(only used internally - unnecessary export)"

#### Options

- `--json` / `-j`: Output results as JSON format
- `--include-private`: Also check non-exported symbols (future enhancement)

#### Special Cases

1. **Index file exports**: If a symbol is exported from a file matching `src/index.*` (e.g., `src/index.ts`, `src/index.tsx`), assume the symbol is "used" (it's part of the public API).

2. **Re-exported files**: If a file is re-exported via `export * from './module'` in an index file, all exports from that file are considered "used".

#### Exclusions

The following are automatically excluded from analysis:
- Declaration files (`.d.ts`)
- Files in `node_modules`
