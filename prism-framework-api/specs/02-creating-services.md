# Creating Services

Services are the building blocks of a Spark Framework application. Each service is self-contained and can define endpoints, middleware, database schemas, and background jobs.

## Basic Service Structure

```typescript
import { ServiceDefinition, createEndpoint } from '@facetlayer/spark-framework';
import { z } from 'zod';

export const definition: ServiceDefinition = {
  name: 'my-service',

  // API endpoints
  endpoints: [
    // ... endpoint definitions
  ],

  // Optional middleware
  middleware: [
    // ... middleware definitions
  ],

  // Optional database schemas
  databases: {
    user: {
      statements: [
        // SQL statements for user database
      ],
    },
  },

  // Optional background jobs
  startJobs: async () => {
    // Initialize background tasks
  },
};
```

## Defining Endpoints

Endpoints are defined with type safety using Zod schemas:

```typescript
const GetUserRequest = z.object({
  userId: z.string(),
});

const GetUserResponse = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

const getUserEndpoint = createEndpoint({
  method: 'GET',
  path: '/api/users/:userId',
  requestSchema: GetUserRequest,
  responseSchema: GetUserResponse,
  requires: ['authenticated-user'], // Optional requirements
  handler: async (input) => {
    // input is typed as z.infer<typeof GetUserRequest>
    const user = await getUserById(input.userId);
    return user; // Must match GetUserResponse schema
  },
});
```

### Endpoint Methods

Supported HTTP methods:
- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`

### Request Data

The framework automatically combines data from:
- Request body (`req.body`)
- URL parameters (`req.params`)
- Query parameters (`req.query`)

All are merged and validated against the `requestSchema`.

### Requirements

The `requires` array can specify:
- `'authenticated-user'` - Requires an authenticated user (checks for user resource in context)

Applications can extend this by providing custom middleware or handlers.

## Server-Sent Events (SSE)

For streaming responses, return an object with a `startSse` method:

```typescript
createEndpoint({
  method: 'GET',
  path: '/api/stream',
  handler: async () => {
    return {
      startSse: (sse: SseResponse) => {
        // Send events
        sse.send({ message: 'Hello' });
        sse.send({ message: 'World' });

        // Close when done
        sse.close();

        // Or handle client disconnect
        sse.onClose(() => {
          console.log('Client disconnected');
        });
      },
    };
  },
});
```

## Adding Middleware

Middleware can be path-specific:

```typescript
export const definition: ServiceDefinition = {
  name: 'my-service',
  middleware: [
    {
      path: '/api/admin/*',
      handler: (req, res, next) => {
        // Check admin permissions
        if (!isAdmin(req)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      },
    },
  ],
};
```

## Database Schemas

Define database schemas per database:

```typescript
export const definition: ServiceDefinition = {
  name: 'users',
  databases: {
    user: {
      statements: [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          created_at DATETIME DEFAULT (datetime('now', 'utc') || 'Z')
        )`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      ],
    },
    project: {
      statements: [
        // Project-specific tables
      ],
    },
  },
};
```

## Background Jobs

Services can start background jobs when the application initializes:

```typescript
export const definition: ServiceDefinition = {
  name: 'cleanup',
  startJobs: async () => {
    // Run periodic cleanup
    setInterval(async () => {
      await cleanupOldData();
    }, 60 * 60 * 1000); // Every hour
  },
};
```

## Error Handling

Use the built-in HTTP error classes:

```typescript
import { NotFoundError, BadRequestError } from '@facetlayer/spark-framework';

handler: async (input) => {
  if (!input.userId) {
    throw new BadRequestError('User ID is required');
  }

  const user = await getUserById(input.userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}
```

Available error classes:
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (422)
- `NotImplementedError` (501)
- `ServiceUnavailableError` (503)
- `HttpError` (custom status code)
