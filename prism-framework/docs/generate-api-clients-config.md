---
name: generate-api-clients-config
description: Configuration file setup for automatic API client type generation
---

# Generate API Clients Configuration

The `prism generate-api-clients` command generates TypeScript types from your API's OpenAPI schema. You can configure output targets using a `.prism.qc` config file.

## Config File Location

Create a `.prism.qc` file in your project root (where you run `prism` commands from).

## Basic Syntax

The config uses the QC format. Each target is defined with a `generate-api-client` command:

```
generate-api-client
  output-file=<path-to-output-file>
```

The `output-file` path is relative to the project root.

## Examples

### Single Output File

```
generate-api-client
  output-file=./src/api-types.ts
```

### Multiple Output Files

You can define multiple targets to generate the same types to multiple locations:

```
generate-api-client
  output-file=./ui/src/lib/api-types.ts

generate-api-client
  output-file=./mobile/src/api-types.ts
```

### Typical Project Layouts

**Monorepo with separate UI package:**

```
generate-api-client
  output-file=./ui/src/lib/api-types.ts
```

**Monorepo with web directory:**

```
generate-api-client
  output-file=./web/src/client/api-types.ts
```

## Usage

Once configured, run:

```bash
prism generate-api-clients
```

The command will:
1. Resolve the API server's base URL for the current project directory (via `@facetlayer/port-assignment`).
2. Fetch the OpenAPI schema from the server.
3. Generate TypeScript types and write them to all configured output files.

The framework exposes the OpenAPI schema at `/api/openapi.json` (enable it by passing `openapiConfig: { enable: true }` to `startServer`). Keep the server running while `prism generate-api-clients` executes.

You can also override the config by specifying `--out` directly:

```bash
prism generate-api-clients --out ./custom/path/types.ts
```

## Requirements

- The API server must be running with OpenAPI enabled (`openapiConfig: { enable: true }` on `startServer`), serving the schema at `/api/openapi.json`.
- The project directory must have a port claimed via `@facetlayer/port-assignment` (either by running the server once, or by running `npx @facetlayer/port-assignment claim --name <project>`).
