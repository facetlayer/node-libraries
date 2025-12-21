# prism-framework-tools

CLI tooling for the Prism app framework ecosystem.

## Important Files and Directories

### Source Code (`src/`)
- `cli.ts` - Main CLI entry point, uses yargs for argument parsing
- `call-command.ts` - Logic for calling endpoints, handles JSON parsing of arguments
- `generate-api-clients.ts` - Generates TypeScript types from OpenAPI schema
- `list-endpoints-command.ts` - Lists available endpoints from the API server
- `loadEnv.ts` - Environment variable loading and validation
- `getPorts.ts` - Port number utilities

### Documentation (`docs/`)

Markdown files for documentation.

Run `doc-files list-docs` to understand the format.

- `getting-started.md` - Setup guide for Prism Framework projects
- `run-endpoint-tool.md` - Detailed CLI usage documentation
- `env-files.md` - Environment configuration strategy

### Tests (`test/`)
- `call-command.test.ts` - Unit tests for argument parsing logic

### Build Output
- `dist/cli.js` - Compiled CLI executable (ES modules)

## Build Commands

```bash
pnpm build      # Build the project
pnpm test       # Run tests with Vitest
pnpm typecheck  # TypeScript type checking
```

## Key Dependencies

- `yargs` - CLI argument parsing
- `dotenv` - Environment variable loading
- `@facetlayer/doc-files-helper` - Documentation file management
- `@facetlayer/prism-framework-api` - Prism API framework types
