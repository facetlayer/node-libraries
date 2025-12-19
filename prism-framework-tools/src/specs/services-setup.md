---
name: services-setup
description: Service-based architecture pattern using ALL_SERVICES registry for endpoints, schemas, and jobs
---

# Service Architecture Pattern: ALL_SERVICES

## Overview

The Prism Framework uses a service-based architecture where each service encapsulates related functionality including endpoints, database schemas, middleware, and background jobs. The `ALL_SERVICES` array provides a central registry of all services in the application.

## File Structure

### Service Definition Files

Each service should have an `index.ts` file that exports a `definition` object:

```typescript
// src/my_service/index.ts
import { ServiceDefinition } from '#src/_framework/ServiceDefinition.ts';
import { statements } from './database/schema.ts';
import { myServiceEndpoints } from './endpoints.ts';

export const definition: ServiceDefinition = {
  name: 'my_service',
  endpoints: myServiceEndpoints,
  databases: {
    user: {
      statements,
    },
  },
};

export * from './database/index.ts';
export * from './schemas/index.ts';
```

### Central Services Registry

The `src/_main/services.ts` file imports all service definitions and exports them as an array:

```typescript
// src/_main/services.ts
import { ServiceDefinition } from '#src/_framework/ServiceDefinition.ts';
import { definition as authDefinition } from '#src/auth';
import { definition as draftsDefinition } from '#src/drafts';
import { definition as healthDefinition } from '#src/health';

export const ALL_SERVICES: ServiceDefinition[] = [
  authDefinition,
  draftsDefinition,
  healthDefinition,
];
```

## ServiceDefinition Interface

The `ServiceDefinition` interface defines the structure of a service:

```typescript
export interface ServiceDefinition {
  // Required: unique service name (typically lowercase with underscores)
  name: string;

  // Optional: array of HTTP endpoint definitions
  endpoints?: EndpointDefinition<any, any>[];

  // Optional: middleware to be registered for this service
  middleware?: MiddlewareDefinition[];

  // Optional: database schema statements organized by database type
  databases?: {
    [databaseName in DatabaseName]?: {
      statements: string[];
    };
  };

  // Optional: async function to start background jobs/workers
  startJobs?: () => Promise<void>;
}
```

### Database Types

The framework supports multiple database types:
- `user` - User-scoped database
- `project` - Project-scoped database
- `desktop-app` - Desktop application database

## Creating a New Service

### Step 1: Create Service Directory

Create a new directory under `src/` with your service name (use lowercase with underscores):

```bash
mkdir -p src/my_service
```

### Step 2: Create Service Structure

Create the following subdirectories as needed:
- `database/` - Database schema and queries
- `actions/` - Business logic functions
- `schemas/` - Zod schemas for validation
- `endpoints.ts` - HTTP endpoint definitions
- `index.ts` - Service definition export

### Step 3: Create Service Definition

Create `src/my_service/index.ts`:

```typescript
import { ServiceDefinition } from '#src/_framework/ServiceDefinition.ts';
import { myServiceEndpoints } from './endpoints.ts';

export const definition: ServiceDefinition = {
  name: 'my_service',
  endpoints: myServiceEndpoints,
};
```

### Step 4: Register Service

Add the service to `src/_main/services.ts`:

```typescript
import { definition as myServiceDefinition } from '#src/my_service';

export const ALL_SERVICES: ServiceDefinition[] = [
  // ... existing services
  myServiceDefinition,
];
```

## Usage in Framework

The framework uses `ALL_SERVICES` to:

1. **Register endpoints** - All endpoint definitions are collected and registered with the web server
2. **Initialize databases** - Database schemas are executed during application startup
3. **Register middleware** - Service-specific middleware is mounted at appropriate paths
4. **Start background jobs** - The `startJobs()` function is called during initialization

Example framework initialization:

```typescript
import { ALL_SERVICES } from './services.ts';

export async function initializeApp() {
  // Initialize databases
  for (const service of ALL_SERVICES) {
    if (service.databases) {
      await initializeDatabases(service.databases);
    }
  }

  // Register endpoints and middleware
  for (const service of ALL_SERVICES) {
    if (service.endpoints) {
      registerEndpoints(service.endpoints);
    }
    if (service.middleware) {
      registerMiddleware(service.middleware);
    }
  }

  // Start background jobs
  for (const service of ALL_SERVICES) {
    if (service.startJobs) {
      await service.startJobs();
    }
  }
}
```

## Best Practices

1. **Service Naming**: Use lowercase with underscores (e.g., `user_account`, `mcp_integration`)

2. **Service Scope**: Each service should have a single, well-defined responsibility

3. **Import Order**: Keep services in alphabetical order in `ALL_SERVICES` for maintainability

4. **Exports**: Export database functions, schemas, and types from the service's `index.ts` for use by other services

5. **Dependencies**: Services can depend on each other by importing types and functions, but avoid circular dependencies

6. **Testing**: Each service should have its own `__tests__` directory

## Desktop Applications

For desktop Electron applications using the Prism Framework, the same pattern applies:

```typescript
// src/_main/services.ts
import { ServiceDefinition } from '@facetlayer/prism-framework-desktop';

export const ALL_SERVICES: ServiceDefinition[] = [
  // Service definitions for desktop app
];
```

Desktop services may include IPC handlers instead of HTTP endpoints, but follow the same organizational structure.

## Example: Complete Service

```typescript
// src/user_account/index.ts
import { ServiceDefinition } from '#src/_framework/ServiceDefinition.ts';
import { statements } from './database/schema.ts';
import { userAccountEndpoints } from './endpoints.ts';
import { startUserSyncJob } from './jobs/sync.ts';

export const definition: ServiceDefinition = {
  name: 'user_account',
  endpoints: userAccountEndpoints,
  databases: {
    user: {
      statements,
    },
  },
  startJobs: async () => {
    await startUserSyncJob();
  },
};

export * from './database/index.ts';
export * from './schemas/index.ts';
export * from './actions/index.ts';
```

## Related Documentation

- See individual service directories for service-specific documentation
- Refer to framework documentation for endpoint and middleware patterns
- Check database documentation for schema migration strategies
