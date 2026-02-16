# Prism Framework API

A TypeScript framework for building web-based SaaS applications and desktop Electron apps with a unified codebase.

**Important:** This framework uses **Zod v4** for schema validation. Make sure to install `zod@^4` — Zod v3 is not compatible and will produce confusing type errors.

## Quick Start

```typescript
import { createEndpoint, App, startServer, ServiceDefinition } from '@facetlayer/prism-framework-api';
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

> **Note**: Endpoint paths should NOT start with `/api`. The framework mounts endpoints at the root path.

## Documentation

This package includes built-in documentation. Use the CLI to explore:

```bash
# List available documentation
prism-api list-docs

# Read a specific doc file
prism-api get-doc <doc-name>
```

Available documentation includes:
- `overview` - Framework overview and concepts
- `creating-services` - How to create services and endpoints
- `server-setup` - Server configuration options
- `database-setup` - Database integration
- `authorization` - Authentication and authorization
- `launch-configuration` - App configuration options

## Testing Endpoints

Use the `prism` CLI (from `@facetlayer/prism-framework-tools`) to test your endpoints:

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
import { App } from '@facetlayer/prism-framework-api';

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
