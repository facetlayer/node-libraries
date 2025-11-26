# @facetlayer/build-config-cli-app

Shared build configuration for CLI applications using esbuild and TypeScript.

## Features

- Bundles 'dist' code using esbuild with helpful defaults.
- Generates TypeScript declaration files

## Installation

```bash
pnpm add -D @facetlayer/build-config-cli-app
```

## Usage

Create a `build.mts` file in your project root:

```typescript
import { runBuildTool } from '@facetlayer/build-config-cli-app';

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

Build the project using esbuild and generate TypeScript declarations.

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

The validate command checks:
1. **tsconfig.json settings**:
   - `noEmit` must be set to `true`
   - `allowImportingTsExtensions` must be set to `true`

2. **TypeScript imports**:
   - All local imports (starting with `./` or `../`) must include the `.ts` extension

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
import { runBuildTool } from '@facetlayer/build-config-cli-app';

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
