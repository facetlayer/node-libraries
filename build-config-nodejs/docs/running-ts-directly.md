---
name: running-ts-directly
description: How to set up scripts to run .ts files directly with Node.js
---

# Running TypeScript Files Directly

Node.js v24+ includes built-in type stripping, which allows you to run `.ts` files directly without a separate compilation step.

## Setup Requirements

### 1. package.json

Your `package.json` must have ESM enabled:

```json
{
  "type": "module"
}
```

### 2. tsconfig.json

Your `tsconfig.json` needs these settings:

```json
{
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true
  }
}
```

### 3. Import Paths Must Use Exact Filenames

All relative-path imports must end in `.ts` to exactly match the filename:

```typescript
// Correct
import { myFunction } from './utils.ts';
import { Config } from '../config/types.ts';

// Incorrect - will not work
import { myFunction } from './utils';
import { myFunction } from './utils.js';
```

## Running Scripts

You can run `.ts` files directly:

```bash
node src/cli.ts
```

Or make the file executable with a shebang:

```typescript
#! /usr/bin/env node

// Your code here
```

Then run it directly:

```bash
chmod +x build.mts
./build.mts build
```

## Code Patterns That Don't Work

Node's type stripping only removes type annotations. It does not transform TypeScript-specific runtime features. The following patterns **will not work**:

### Enums

```typescript
// Does NOT work - enums require transformation
enum Status {
  Active,
  Inactive
}
```

Use const objects or union types instead:

```typescript
// Works - const object
const Status = {
  Active: 'active',
  Inactive: 'inactive'
} as const;

type Status = typeof Status[keyof typeof Status];

// Works - union type
type Status = 'active' | 'inactive';
```

### Parameter Properties

```typescript
// Does NOT work - requires transformation
class User {
  constructor(public name: string) {}
}
```

Use explicit property declarations:

```typescript
// Works
class User {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
```

### Namespaces

```typescript
// Does NOT work
namespace MyNamespace {
  export const value = 1;
}
```

Use modules instead:

```typescript
// Works - use ES modules
export const value = 1;
```

## Validation

Use the `validate` command to check that your project follows these conventions:

```bash
node build.mts validate
```

To automatically fix issues:

```bash
node build.mts validate --fix
```

The validate command checks:
- `package.json` has `type: "module"`
- `tsconfig.json` has `noEmit: true` and `allowImportingTsExtensions: true`
- All imports use `.ts` extensions
