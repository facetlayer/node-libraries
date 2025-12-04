# @facetlayer/build-config-nodejs

Shared build configuration for Node.js based libraries using ESBuild and TypeScript.

Rename: This library was previously named `build-config-cli-app`

## Features

 - Bundles 'dist' code using esbuild with helpful defaults.
 - Generates TypeScript declaration files

## Importing .ts filenames

This is an opinionated library and it will enforce a style of using ".ts" filenames in imports.

This means:

 - All relative-path import filenames in your code must end in ".ts" to exactly match the filename.
 - The tsconfig.json file must have noEmit enabled.
 - The package.json must have type=module.
 - For developing, you can directly run a .ts file in Node v24 and above, thanks to builtin type stripping.
   - There are a few Typescript features such as `enum` which will not work in this mode.
   - Don't use those features.
 - For publishing, this library uses ESbuild to produce ESM compatible bundles that use a .js extension.

The above requirements will be checked by the `validate` and `validate --fix` commands.

## Installation

```bash
pnpm add -D @facetlayer/build-config-nodejs
```

## Usage

Create a `build.mts` file in your project root:

```typescript
#! /usr/bin/env node

import { runBuildTool } from '@facetlayer/build-config-nodejs';

await runBuildTool({
  entryPoints: ['src/cli.ts'],
});
```

Then run the build:

```bash
node build.mts build
```

## Commands

### `build`

Build the project using ESBuild and generate TypeScript declarations.

```bash
node build.mts build
```

### `validate`

Validate project configuration and TypeScript imports.

```bash
node build.mts validate
```

Options:
- `--fix`: Automatically fix issues
- `--tsconfig <path>`: Path to tsconfig.json (default: `./tsconfig.json`)
- `--src <path>`: Source directory (default: `./src`)

The validate command checks various settings in the code and in the project level configuration.

Example with auto-fix:

```bash
node build.mts validate --fix
```

## Configuration

The `runBuildTool` function accepts a configuration object with the following options:

### `entryPoints`
- Type: `string[]`
- Default: `['src/cli.ts']`
- Entry points for esbuild

### `outDir`
- Type: `string`
- Default: `'dist'`
- Output directory for built files

### `platform`
- Type: `'node' | 'browser' | 'neutral'`
- Default: `'node'`
- Platform target

### `target`
- Type: `string`
- Default: `'node16'`
- Target environment

### `format`
- Type: `'esm' | 'cjs' | 'iife'`
- Default: `'esm'`
- Output format

### `packageJsonPath`
- Type: `string`
- Default: `'./package.json'`
- Path to package.json (relative to cwd or absolute)

### `tsconfigPath`
- Type: `string`
- Default: `'./tsconfig.json'`
- Path to tsconfig.json (relative to cwd or absolute)

### `additionalExternals`
- Type: `string[]`
- Additional external dependencies beyond those in package.json

### `esbuildOverrides`
- Type: `Partial<BuildOptions>`
- Override any esbuild configuration

### `typeGenConfig`
- Type: `{ outDir?: string; rootDir?: string; include?: string[]; exclude?: string[] }`
- TypeScript compiler options override for type generation

## Example with Overrides

```typescript
#! /usr/bin/env node

import { runBuildTool } from '@facetlayer/build-config-nodejs';

await runBuildTool({
  entryPoints: ['src/cli.ts', 'src/api.ts'],
  outDir: 'dist',
  target: 'node18',
  additionalExternals: ['electron'],
  esbuildOverrides: {
    minify: true,
  },
});
```

## How it Works

1. **Reads package.json**: Automatically loads all dependencies and marks them as external
2. **Runs esbuild**: Bundles your code with the specified configuration
3. **Generates types**: Uses TypeScript compiler to generate declaration files from your tsconfig.json

## TypeScript Configuration

Your project should have a `tsconfig.json` with the following required settings:
- `noEmit: true` - The build tool will override this when generating declaration files
- `allowImportingTsExtensions: true` - Required for using `.ts` extensions in imports

Example `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  }
}
```

## License

ISC
