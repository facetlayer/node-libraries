# prism-framework

Base library, server framework, and CLI tools for the Prism app framework ecosystem.

## Important Files and Directories

### Source Code (`src/`)

#### CLI Tools
- `cli.ts` - Main CLI entry point, uses yargs for argument parsing
- `call-command.ts` - Logic for calling endpoints, handles JSON parsing of arguments
- `generate-api-clients.ts` - Generates TypeScript types from OpenAPI schema
- `list-endpoints-command.ts` - Lists available endpoints from the API server
- `loadEnv.ts` - Environment variable loading and validation
- `getPorts.ts` - Port number utilities
- `config/` - Config file loading (.prism.qc)

#### Server Framework
- `index.ts` - Main library exports (re-exports all public API)
- `Errors.ts` - HTTP error classes (BadRequestError, NotFoundError, etc.)
- `Metrics.ts` - Prometheus metrics integration
- `RequestContext.ts` - AsyncLocalStorage-based request context
- `ServiceDefinition.ts` - Service and middleware type definitions
- `app/` - PrismApp class, endpoint calling, app validation
- `authorization/` - Authorization system (resources, auth sources, permissions)
- `databases/` - Database setup and initialization
- `endpoints/` - Endpoint creation and validation (createEndpoint)
- `env/` - Environment variable loading
- `launch/` - Launch configuration system
- `logging/` - Logging utilities
- `sse/` - SSE connection management
- `web/` - Express.js setup, CORS, middleware, OpenAPI, endpoint listing

### Documentation (`docs/`)

Markdown files for documentation.

Run `prism list-docs` to browse available documentation.

- `getting-started.md` - Setup guide for Prism Framework projects
- `overview.md` - Framework overview and core concepts
- `creating-services.md` - How to create services and endpoints
- `server-setup.md` - Server configuration options
- `database-setup.md` - Database integration
- `authorization.md` - Authentication and authorization
- `launch-configuration.md` - App configuration options
- `cors-setup.md` - CORS configuration
- `source-directory-organization.md` - Recommended project structure
- `endpoint-tools.md` - CLI tools for calling endpoints
- `env-files.md` - Environment configuration strategy

### Tests
- `test/` - CLI tool tests
- `src/__tests__/` - Server framework tests
- `src/web/__tests__/` - Web/OpenAPI tests

### Build Output
- `dist/cli.js` - Compiled CLI executable
- `dist/index.js` - Compiled library entry point

## Build Commands

```bash
pnpm build      # Build the project
pnpm test       # Run tests with Vitest
pnpm typecheck  # TypeScript type checking
```

## Key Dependencies

- `express` - HTTP server framework
- `zod` - Schema validation (requires v4)
- `yargs` - CLI argument parsing
- `dotenv` - Environment variable loading
- `@facetlayer/doc-files-helper` - Documentation file management
- `@facetlayer/sqlite-wrapper` - SQLite database integration
- `prom-client` - Prometheus metrics
- `swagger-ui-express` - Swagger UI for OpenAPI docs
