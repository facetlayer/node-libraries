---
name: authorization
description: Authorization system with resources, credentials, and permissions
---

# Authorization System

Prism Framework includes a flexible authorization system based on resources, credentials, and permissions.

## Core Concepts

### Resources

Resources represent entities that can be accessed:

```typescript
interface Resource {
  type: 'user' | 'project' | 'session' | 'custom';
  id: string;
}
```

### Credentials

Credentials represent how a user authenticated:

```typescript
interface Credential {
  type: string;
}

interface CookieCredential extends Credential {
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

The `Authorization` class manages resources, credentials, and permissions:

```typescript
import { Authorization } from '@facetlayer/prism-framework-api';

const auth = new Authorization();

// Add resources
auth.addResource({ type: 'user', id: '123' });
auth.addResource({ type: 'project', id: 'abc' });

// Check resources
if (auth.hasResource('user')) {
  const user = auth.getResource('user');
  console.log(user.id); // '123'
}

// Add credentials
auth.addCredential({
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

Every request has an `Authorization` instance in its context:

```typescript
import { getCurrentRequestContext } from '@facetlayer/prism-framework-api';

// In endpoint handler
const context = getCurrentRequestContext();
const auth = context.auth;

// Check if user is authenticated
const user = auth.getResource('user');
if (!user) {
  throw new UnauthorizedError('Authentication required');
}
```

## Middleware Example

Create middleware to populate authorization:

```typescript
import { MiddlewareDefinition } from '@facetlayer/prism-framework-api';

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
        // Add credential
        context.auth.addCredential({
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

Use the `requires` array to enforce authentication:

```typescript
createEndpoint({
  method: 'GET',
  path: '/api/protected',
  requires: ['authenticated-user'],
  handler: async () => {
    // This handler only runs if user is authenticated
    const context = getCurrentRequestContext();
    const user = context.auth.getResource('user');
    return { userId: user.id };
  },
});
```

The `'authenticated-user'` requirement checks that a user resource exists in the authorization context.

## Custom Authorization Checks

Implement custom authorization logic in your handlers:

```typescript
import { ForbiddenError } from '@facetlayer/prism-framework-api';

createEndpoint({
  method: 'DELETE',
  path: '/api/projects/:projectId',
  requires: ['authenticated-user'],
  handler: async (input) => {
    const context = getCurrentRequestContext();

    // Check permission
    if (!context.auth.hasPermission('delete:projects')) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Check project ownership
    const project = await getProject(input.projectId);
    const user = context.auth.getResource('user');

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
import { getCurrentRequestContext, ForbiddenError } from '@facetlayer/prism-framework-api';

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
