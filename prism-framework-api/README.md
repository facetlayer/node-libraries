# Prism Framework API

A TypeScript framework for building web-based SaaS applications and desktop Electron apps with a unified codebase.

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
      path: '/api/hello',
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
  const app = new App([myService]);

  await startServer({
    app,
    port: 3000,
  });

  console.log('Server running at http://localhost:3000');
}

main().catch(console.error);
```

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

## Environment Variables

```bash
# Optional
PORT=3000
API_BASE_URL=https://api.example.com
WEB_BASE_URL=https://example.com
ENABLE_TEST_ENDPOINTS=true
```

## Key Concepts

### App

The `App` class wraps your services and provides endpoint routing:

```typescript
import { App } from '@facetlayer/prism-framework-api';

const app = new App([service1, service2]);
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
  path: '/api/users',
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

## License

MIT
