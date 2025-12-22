---
name: source-directory-organization
description: Recommended directory structure for organizing Prism API source code
---

# Source Directory Organization

This document describes the recommended directory structure for organizing your Prism API source code. Following this pattern ensures consistency across projects and makes navigation intuitive.

## Directory Structure

```
src/
├── _main/              # Main application bootstrap
│   ├── api.ts          # Entry point - starts the server
│   └── services.ts     # Exports ALL_SERVICES array
├── <service-name>/     # One folder per service
│   ├── index.ts        # Service definition export
│   └── ...             # Additional service files
├── <service-name>/
│   └── index.ts
└── <shared-resource>/  # Shared resources (databases, utils)
    └── ...
```

## Key Principles

### 1. The `_main` Folder

The `_main` folder contains the application entry point and service aggregation. The underscore prefix ensures it sorts to the top of the directory listing.

**`_main/api.ts`** - The main entry point:

```typescript
import { startServer, App } from '@facetlayer/prism-framework-api';
import { config } from 'dotenv';
import { ALL_SERVICES } from './services.ts';

async function main() {
  config({ path: '.env' });

  const app = new App(ALL_SERVICES);

  await startServer({
    app,
    port: parseInt(process.env.PRISM_API_PORT!),
    openapiConfig: {
      enable: true,
      enableSwagger: true,
    },
  });
}

main().catch(console.error);
```

**`_main/services.ts`** - Aggregates all services:

```typescript
import { type ServiceDefinition } from '@facetlayer/prism-framework-api';
import { definition as usersDefinition } from '../users/index.ts';
import { definition as projectsDefinition } from '../projects/index.ts';

export const ALL_SERVICES: ServiceDefinition[] = [
  usersDefinition,
  projectsDefinition,
];
```

### 2. Service Folders

Each service lives in its own top-level folder named after the service. The folder contains an `index.ts` that exports the service definition.

**Example: `users/index.ts`**

```typescript
import { createEndpoint, type ServiceDefinition } from '@facetlayer/prism-framework-api';
import { z } from 'zod';

const getUserEndpoint = createEndpoint({
  method: 'GET',
  path: '/api/users/:id',
  requestSchema: z.object({ id: z.string() }),
  responseSchema: z.object({ id: z.string(), email: z.string() }),
  handler: async (input) => {
    // Implementation
  },
});

export const definition: ServiceDefinition = {
  name: 'users',
  endpoints: [getUserEndpoint],
};
```

### 3. No `services` Directory

Services should NOT be placed in a `services/` subdirectory. Each service folder exists at the top level of `src/`:

**Correct:**
```
src/
├── _main/
├── users/
├── projects/
└── billing/
```

**Incorrect:**
```
src/
├── index.ts
└── services/
    ├── users.ts
    ├── projects.ts
    └── billing.ts
```

### 4. Shared Resources

Non-service folders (databases, utilities) can also exist at the top level:

```
src/
├── _main/
├── users/
├── projects/
└── user-database/      # Shared database module
    └── db.ts
```

## Benefits

1. **Discoverability** - The `_main` folder clearly identifies the entry point
2. **Modularity** - Each service is self-contained in its own folder
3. **Scalability** - Adding services means adding folders, not modifying existing structure
4. **Consistency** - All projects follow the same pattern
5. **Clarity** - The `ALL_SERVICES` array provides a single source of truth for what services exist
