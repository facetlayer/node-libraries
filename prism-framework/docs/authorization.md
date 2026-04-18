---
name: authorization
description: Authorization system with resources, auth sources, and permissions
---

# Authorization System

Prism Framework includes a flexible authorization system based on resources, auth sources, and permissions.

## Core Concepts

### Resources

Resources represent entities that can be accessed:

```typescript
interface Resource {
  type: 'user' | 'project' | 'session' | 'custom';
  id: string;
}
```

### Auth Sources

Auth sources represent how a user authenticated:

```typescript
interface AuthSource {
  type: string;
}

interface CookieAuthSource extends AuthSource {
  type: 'cookie';
  sessionId: string;
}
```

### Permissions

Permissions are string-based capabilities:

```typescript
type Permission = string;

interface UserPermissions {
  userId: string;
  permissions: Permission[];
}
```

## Authorization Class

The `Authorization` class manages resources, auth sources, and permissions:

```typescript
import { Authorization } from '@facetlayer/prism-framework';

const auth = new Authorization();

// Add resources
auth.addResource({ type: 'user', id: '123' });
auth.addResource({ type: 'project', id: 'abc' });

// Check resources
if (auth.hasResource('user')) {
  const user = auth.getResource('user');
  console.log(user.id); // '123'
}

// Add auth sources
auth.addAuthSource({
  type: 'cookie',
  sessionId: 'session-xyz',
});

// Set permissions
auth.setUserPermissions({
  userId: '123',
  permissions: ['read:projects', 'write:projects'],
});

// Check permissions
if (auth.hasPermission('write:projects')) {
  // User can write projects
}
```

## Request Context Integration

Every in-flight request has an `Authorization` instance attached to its `RequestContext`. Retrieve it with `getCurrentRequestContext()`:

```typescript
import { getCurrentRequestContext, UnauthorizedError } from '@facetlayer/prism-framework';

// In endpoint handler
const context = getCurrentRequestContext();
if (!context) {
  // This only happens when code runs outside of any request (e.g. a background job).
  throw new Error('No request context available');
}
const auth = context.auth;

// Check if user is authenticated
const user = auth.getResource('user');
if (!user) {
  throw new UnauthorizedError('Authentication required');
}
```

`getCurrentRequestContext()` returns `RequestContext | undefined`. It is defined whenever code is reached through an HTTP request (web), an IPC call (desktop), or an `apiFetch`/`callEndpoint` on mobile — but it is undefined in `startJobs` callbacks and other background code, so always handle the undefined case in shared helpers.

## Middleware Example

Create middleware to populate authorization:

```typescript
import { MiddlewareDefinition } from '@facetlayer/prism-framework';

export const authMiddleware: MiddlewareDefinition = {
  path: '/api/*',
  handler: async (req, res, next) => {
    const context = getCurrentRequestContext();

    // Check for session cookie
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      // Look up session
      const session = await getSession(sessionId);
      if (session) {
        // Add auth source
        context.auth.addAuthSource({
          type: 'cookie',
          sessionId,
        });

        // Add user resource
        context.auth.addResource({
          type: 'user',
          id: session.userId,
        });

        // Load and set permissions
        const permissions = await getUserPermissions(session.userId);
        context.auth.setUserPermissions({
          userId: session.userId,
          permissions,
        });
      }
    }

    next();
  },
};
```

## Endpoint Requirements

The `requires` array is a hint for framework-aware tooling and middleware. Today the only value the framework defines is:

- `'authenticated-user'` — indicates the handler assumes a `user` resource is present on `context.auth`.

The base framework does **not** automatically reject unauthenticated calls based on `requires`; the handler (or a middleware you write) is still responsible for the actual check. Treat `requires` as documentation the framework can consume (for OpenAPI metadata, middleware, etc.), and always guard handlers explicitly:

```typescript
createEndpoint({
  method: 'GET',
  path: '/protected',  // served at /api/protected
  requires: ['authenticated-user'],
  handler: async () => {
    const context = getCurrentRequestContext();
    const user = context?.auth.getResource('user');
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    return { userId: user.id };
  },
});
```

## Custom Authorization Checks

Implement custom authorization logic in your handlers:

```typescript
import { ForbiddenError, UnauthorizedError, getCurrentRequestContext } from '@facetlayer/prism-framework';

createEndpoint({
  method: 'DELETE',
  path: '/projects/:projectId',  // served at /api/projects/:projectId
  requires: ['authenticated-user'],
  handler: async (input) => {
    const context = getCurrentRequestContext();
    const user = context?.auth.getResource('user');
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check permission
    if (!context!.auth.hasPermission('delete:projects')) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Check project ownership
    const project = await getProject(input.projectId);

    if (project.ownerId !== user.id) {
      throw new ForbiddenError('Not the project owner');
    }

    await deleteProject(input.projectId);
    return { success: true };
  },
});
```

## Permission Patterns

Common permission naming patterns:

```typescript
// Resource:Action format
'read:projects'
'write:projects'
'delete:projects'
'admin:users'

// Hierarchical permissions
'projects:read'
'projects:write'
'projects:delete'

// Role-based
'role:admin'
'role:editor'
'role:viewer'
```

## Helper Functions

Create helper functions for common authorization checks:

```typescript
import { getCurrentRequestContext, ForbiddenError, UnauthorizedError } from '@facetlayer/prism-framework';

export function requirePermission(permission: string) {
  const context = getCurrentRequestContext();
  if (!context?.auth.hasPermission(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

export function requireProjectAccess(projectId: string) {
  const context = getCurrentRequestContext();
  const user = context?.auth.getResource('user');
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  const project = getProject(projectId);
  if (project.ownerId !== user.id) {
    throw new ForbiddenError('Project access denied');
  }
}

// Usage in handlers
handler: async (input) => {
  requirePermission('write:projects');
  requireProjectAccess(input.projectId);

  // Proceed with the operation
  await updateProject(input.projectId, input.updates);
  return { success: true };
}
```

## Multi-Tenant Support

Use resources to track tenant/organization context:

```typescript
// Add organization resource
context.auth.addResource({
  type: 'custom',
  id: 'org:acme-corp',
});

// Check organization access
const org = context.auth.getAllResources()
  .find(r => r.id.startsWith('org:'));

if (!org) {
  throw new ForbiddenError('No organization context');
}
```
