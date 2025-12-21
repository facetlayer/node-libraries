# @facetlayer/prism-framework-tools

CLI tooling for the Prism app framework.

## Installation

```bash
npm install @facetlayer/prism-framework-tools
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `prism list-endpoints` | List all available endpoints from the API server |
| `prism call [METHOD] [PATH] [--args]` | Call an endpoint on the running API server |
| `prism generate-api-clients --out <file>` | Generate TypeScript types from OpenAPI schema |
| `prism list-docs` | List available documentation |
| `prism get-doc <name>` | Display a specific documentation file |

### Examples

```bash
# List all endpoints
prism list-endpoints

# Call endpoints
prism call /api/users                              # GET request
prism call POST /api/users --name "John"           # POST with body
prism call POST /api/data --config '{"timeout":30}'  # JSON arguments

# Generate TypeScript types
prism generate-api-clients --out ./src/api-types.ts

# Access documentation
prism list-docs
prism get-doc getting-started
```

## Documentation

Once installed, the CLI has `prism list-docs` and `prism get-doc ...` commands to browse through the documentation files.

Run `prism list-docs` to see available documentation topics, including:
- `getting-started` - Setup guide for Prism Framework projects
- `run-endpoint-tool` - Detailed CLI usage documentation
- `env-files` - Environment configuration strategy
