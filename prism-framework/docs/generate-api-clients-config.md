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
1. Read the API server URL from your `.env` file (`PRISM_API_PORT`)
2. Fetch the OpenAPI schema from `http://localhost:<port>/openapi.json`
3. Generate TypeScript types and write them to all configured output files

You can also override the config by specifying `--out` directly:

```bash
prism generate-api-clients --out ./custom/path/types.ts
```

## Requirements

- The API server must be running and serving `/openapi.json`
- A `.env` file with `PRISM_API_PORT` must exist in the project root
