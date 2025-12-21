---
name: overview
description: Introduction to Prism Framework and its core concepts
---

# Prism Framework Overview

Prism Framework is a TypeScript framework for building web-based SaaS applications and desktop Electron apps. It provides a unified approach to creating applications that can run in both backend (Express.js) and desktop (Electron) contexts.

## Key Features

1. **Service-Based Architecture** - Organize your application into self-contained services
2. **Type-Safe Endpoints** - Define endpoints with Zod schemas for request/response validation
3. **Launch Configuration** - Single configuration system that works for both web and desktop
4. **Database Management** - Integration with `@facetlayer/sqlite-wrapper` for database operations
5. **Request Context** - AsyncLocalStorage-based request context tracking
6. **Authorization** - Built-in authorization system with resources and credentials
7. **Metrics** - Prometheus metrics integration
8. **SSE Support** - Server-Sent Events for real-time communication
9. **Error Handling** - Comprehensive HTTP error classes

## Core Concepts

### Services

A service is a self-contained module that can include:
- API endpoints
- Middleware
- Database schemas
- Background jobs

```typescript
import { ServiceDefinition, createEndpoint } from '@facetlayer/prism-framework-api';

export const myService: ServiceDefinition = {
  name: 'my-service',
  endpoints: [
    createEndpoint({
      method: 'GET',
      path: '/api/hello',
      handler: async () => ({ message: 'Hello World' }),
    }),
  ],
  databases: {
    user: {
      statements: [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          email TEXT NOT NULL
        )`,
      ],
    },
  },
};
```

### Launch Configuration

The launch configuration system allows the same code to work in different contexts (backend server, Electron desktop app):

```typescript
import { setLaunchConfig } from '@facetlayer/prism-framework-api';

setLaunchConfig({
  logging: {
    databaseFilename: '/path/to/logs.db',
    enableConsoleLogging: true,
    loadDatabase: await loadBetterSqlite(),
  },
  database: {
    user: {
      migrationBehavior: 'safe-upgrades',
      databasePath: '/path/to/databases',
      services: [myService],
      loadDatabase: await loadBetterSqlite(),
    },
  },
});
```

### Request Context

Every request has an associated context that flows through all async operations:

```typescript
import { getCurrentRequestContext } from '@facetlayer/prism-framework-api';

const context = getCurrentRequestContext();
// Access request ID, auth info, etc.
```

## Project Structure

A typical project using Prism Framework:

```
your-app/
├── src/
│   ├── services/          # Application services
│   │   ├── auth/
│   │   ├── users/
│   │   └── projects/
│   ├── main.ts           # Application entry point
│   └── databases/        # Database initialization
├── package.json
└── tsconfig.json
```

## Getting Started

1. Install the framework:
```bash
pnpm add @facetlayer/prism-framework-api
```

2. Create your first service (see creating-services doc)
3. Set up the launch configuration (see launch-configuration doc)
4. Start the server (see server-setup doc)
