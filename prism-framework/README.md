# @facetlayer/prism-framework

A TypeScript framework for building web-based SaaS applications and desktop Electron apps. Includes a server framework, CLI tools, and development utilities.

**Important:** This framework uses **Zod v4** for schema validation. Make sure to install `zod@^4` — Zod v3 is not compatible and will produce confusing type errors.

## Installation

```bash
pnpm add @facetlayer/prism-framework zod@^4
```

## Quick Start

```typescript
import { createEndpoint, App, startServer, ServiceDefinition } from '@facetlayer/prism-framework';
import { z } from 'zod';

// Define a service with endpoints
const myService: ServiceDefinition = {
  name: 'hello',
  endpoints: [
    createEndpoint({
      method: 'GET',
      path: '/hello',
      description: 'Say hello',
      requestSchema: z.object({ name: z.string() }),
      responseSchema: z.object({ message: z.string() }),
      handler: async (input) => {
        return { message: `Hello, ${input.name}!` };
      },
    }),
  ],
};

// Create app and start server
async function main() {
  const app = new App({ services: [myService] });

  await startServer({
    app,
    port: 3000,
  });

  console.log('Server running at http://localhost:3000');
}

main().catch(console.error);
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
prism call /users                              # GET request
prism call POST /users --name "John"           # POST with body
prism call POST /data --config '{"timeout":30}'  # JSON arguments

# Generate TypeScript types
prism generate-api-clients --out ./src/api-types.ts

# Access documentation
prism list-docs
prism get-doc getting-started
```

## Documentation

This package includes built-in documentation. Use the CLI to explore:

```bash
prism list-docs
prism get-doc <doc-name>
```

Available documentation includes:
- `getting-started` - Setup guide for Prism Framework projects
- `overview` - Framework overview and concepts
- `creating-services` - How to create services and endpoints
- `server-setup` - Server configuration options
- `database-setup` - Database integration
- `authorization` - Authentication and authorization
- `launch-configuration` - App configuration options
- `endpoint-tools` - CLI tools for calling endpoints
- `env-files` - Environment configuration strategy
- `stdin-protocol` - Stdin/stdout protocol for subprocess communication

## Testing Endpoints

Use the `prism` CLI to test your endpoints:

```bash
prism list-endpoints    # See all available endpoints
prism call /hello       # Call an endpoint (GET)
prism call POST /users --name "John" --email "john@example.com"  # POST with data
```

This is preferred over using curl directly because the `prism` CLI automatically reads your `.env` file for the API port.

## Environment Variables

```bash
# Optional
PORT=3000
PRISM_API_PORT=3000     # Used by prism CLI tools
API_BASE_URL=https://api.example.com
WEB_BASE_URL=https://example.com
ENABLE_TEST_ENDPOINTS=true
```

## Key Concepts

### App

The `App` class wraps your services and provides endpoint routing:

```typescript
import { App } from '@facetlayer/prism-framework';

const app = new App({ services: [service1, service2] });
```

### ServiceDefinition

A service groups related endpoints together:

```typescript
const userService: ServiceDefinition = {
  name: 'users',
  endpoints: [
    // ... endpoint definitions
  ],
};
```

### createEndpoint

Define type-safe endpoints with Zod schemas:

```typescript
createEndpoint({
  method: 'POST',
  path: '/users',
  description: 'Create a new user',
  requestSchema: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  responseSchema: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
  handler: async (input) => {
    // input is typed based on requestSchema
    return { id: 1, name: input.name, email: input.email };
  },
});
```

## Stdin/Stdout Protocol Mode

Prism apps can run as subprocesses communicating over stdin/stdout instead of opening an HTTP port. This is useful for composing multiple Prism apps into a single web UI.

```typescript
import { App, startServer, startStdinServer } from '@facetlayer/prism-framework';

const app = new App({ services: [myService] });

if (process.argv.includes('--stdin')) {
  // Communicate via JSON-over-stdin instead of HTTP
  startStdinServer({ app });
} else {
  await startServer({ app, port: 3000 });
}
```

When running in stdin mode, send newline-delimited JSON requests to stdin and receive JSON responses on stdout:

```json
{"id":"req-1","method":"GET","path":"/items"}
```

See `prism get-doc stdin-protocol` for full protocol details.

## Zod Version Requirements

This framework requires **Zod 4.x** (specifically `zod@^4.0.5` or later). If you see TypeScript errors like:

```
Type 'ZodObject<...>' is missing properties from type 'ZodType<...>': def, type, toJSONSchema, check...
```

This indicates a Zod version mismatch. Ensure your project uses Zod 4.x:

```bash
pnpm add zod@^4.0.5
```

## License

MIT
