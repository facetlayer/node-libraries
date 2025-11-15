# Prism Framework

A TypeScript framework for building web-based SaaS applications and desktop Electron apps with a unified codebase.

## Example

```typescript
import { createEndpoint, ServiceDefinition, setLaunchConfig, startServer } from '@facetlayer/prism-framework-api';
import { z } from 'zod';

// Define a service
const myService: ServiceDefinition = {
  name: 'hello',
  endpoints: [
    createEndpoint({
      method: 'GET',
      path: '/api/hello',
      requestSchema: z.object({ name: z.string() }),
      responseSchema: z.object({ message: z.string() }),
      handler: async (input) => {
        return { message: `Hello, ${input.name}!` };
      },
    }),
  ],
};

// Configure and start
async function main() {
  setLaunchConfig({
    database: {
      user: {
        migrationBehavior: 'safe-upgrades',
        databasePath: './databases',
        services: [myService],
        loadDatabase: await loadBetterSqlite(),
      },
    },
  });

  await startServer({
    services: [myService],
    port: 3000,
  });
}

main().catch(console.error);
```

## Environment Variables

```bash
# Required
SQLITE_DATABASE_PATH=/path/to/databases

# Optional
PORT=3000
API_BASE_URL=https://api.example.com
WEB_BASE_URL=https://example.com
ENABLE_TEST_ENDPOINTS=true
```

## License

MIT
