---
name: error-handling
description: HTTP error classes for returning proper status codes from endpoint handlers
---

# Error Handling

Prism Framework provides built-in HTTP error classes. Throw these from endpoint handlers or middleware to return the appropriate status code and error message.

## Usage

```typescript
import { NotFoundError, BadRequestError } from '@facetlayer/prism-framework';

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

## Available Error Classes

| Class | Status Code |
|-------|-------------|
| `BadRequestError` | 400 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `ValidationError` | 422 |
| `NotImplementedError` | 501 |
| `ServiceUnavailableError` | 503 |
| `HttpError` | Custom status code |

## Custom Status Codes

Use `HttpError` for status codes not covered by the named classes:

```typescript
import { HttpError } from '@facetlayer/prism-framework';

throw new HttpError(429, 'Too many requests');
```

## Authorization Errors

For authorization-related errors, use `UnauthorizedError` (not logged in) and `ForbiddenError` (logged in but not allowed):

```typescript
import { UnauthorizedError, ForbiddenError } from '@facetlayer/prism-framework';

const user = context.auth.getResource('user');
if (!user) {
  throw new UnauthorizedError('Authentication required');
}

if (!context.auth.hasPermission('delete:projects')) {
  throw new ForbiddenError('Insufficient permissions');
}
```

See the `authorization` doc for more on how auth and permissions work.
