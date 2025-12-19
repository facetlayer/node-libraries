# @facetlayer/spec-files-helper

Helper library for managing spec files with YAML frontmatter. Provides helper functions to list and read spec files from a directory.

## Installation

```bash
pnpm add @facetlayer/spec-files-helper
```

## Usage

### Listing Specs

```typescript
import { listSpecs } from '@facetlayer/spec-files-helper';

const specs = listSpecs('./specs');
// Returns: [{ name: 'my-spec', description: '...', filename: 'my-spec.md' }, ...]
```

### Getting a Spec

```typescript
import { getSpec } from '@facetlayer/spec-files-helper';

const spec = getSpec('./specs', 'my-spec');
// Returns: { name, description, filename, content, rawContent }
```

## Frontmatter Format

Spec files should have YAML frontmatter at the start:

```markdown
---
name: spec-name
description: Brief description of the spec
---

# Spec Content

Your markdown content here.
```

## API

### `parseFrontmatter(text: string): ParsedDocument`

Parses YAML frontmatter from markdown text.

### `listSpecs(specsDir: string): SpecInfo[]`

Lists all `.md` files in a directory with their frontmatter metadata.

### `getSpec(specsDir: string, name: string): SpecContent`

Gets a specific spec file by name (without `.md` extension). Throws if not found.
