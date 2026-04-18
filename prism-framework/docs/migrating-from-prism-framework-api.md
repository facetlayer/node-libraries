---
name: migrating-from-prism-framework-api
description: Migration guide for moving from @facetlayer/prism-framework-api to the consolidated @facetlayer/prism-framework package
---

# Migrating from prism-framework-api

`@facetlayer/prism-framework-api` was merged into `@facetlayer/prism-framework` starting at version 0.4.1. This guide covers the breaking changes.

## 1. Update the dependency

```json
// Before
"@facetlayer/prism-framework-api": "..."

// After
"@facetlayer/prism-framework": "^0.4.1"
```

Remove `@facetlayer/prism-framework-api` from your package.json.

## 2. Update imports

```typescript
// Before
import { createEndpoint, startServer } from '@facetlayer/prism-framework-api'

// After
import { createEndpoint, startServer } from '@facetlayer/prism-framework'
```

## 3. Endpoints are now mounted under `/api/`

This is the main breaking change. Previously with `prism-framework-api`, endpoints were mounted at the root path. Now all endpoints are automatically mounted under `/api/`.

**Endpoint definitions stay the same** — do not add `/api` to your `path`:

```typescript
// This has NOT changed
createEndpoint({
  path: '/repos',
  method: 'GET',
  // ...
})
```

**But the HTTP URL changes:**

| Before | After |
|--------|-------|
| `GET /repos` | `GET /api/repos` |
| `POST /users` | `POST /api/users` |

### What to update

- **Frontend `fetch()` calls**: Change `/repos` to `/api/repos`
- **`prism call` CLI usage**: Use `prism call /api/repos` (not `/repos`)
- **Proxy configs**: If your frontend proxies API requests, update the proxy path
- **External consumers**: Any external services calling your API need the `/api/` prefix

## 4. Introspection endpoint moved

The endpoint list is now available at `/api/endpoints.json` instead of `/endpoints.json`.
