# @facetlayer/prism-framework-ui

Browser/React helpers for applications built on [Prism Framework](../prism-framework).

The package provides a thin, transport-agnostic fetch layer (`webFetch` / `apiFetch`) so UI code can call Prism endpoints the same way whether the backend is:

- A standard HTTP server (`@facetlayer/prism-framework`)
- An Electron main process (`@facetlayer/prism-framework-desktop`)
- An in-process Expo/React Native app (`@facetlayer/prism-framework-expo`)

## Installation

```bash
pnpm add @facetlayer/prism-framework-ui
```

## API

The package exports:

| Export | Purpose |
|---|---|
| `webFetch(endpoint, options?)` | HTTP-based fetch. Parses `"METHOD /path"` strings, substitutes `:params`, serializes body/query. |
| `apiFetch(endpoint, options?)` | Universal fetch. Delegates to the implementation set by `setFetchImplementation`, or falls back to `webFetch`. |
| `setFetchImplementation(fn)` | Install a non-HTTP transport (e.g. Electron IPC, in-process Expo). UI code that calls `apiFetch` then uses it automatically. |
| `configureWebFetch({ baseUrl })` | Set a global base URL for `webFetch`. Useful when the API runs on a different origin than the UI. |
| `cn(...classes)` | `clsx` + `tailwind-merge` helper for composing Tailwind class names. |

## Usage

### Basic HTTP fetch

```typescript
import { webFetch, configureWebFetch } from '@facetlayer/prism-framework-ui';

configureWebFetch({ baseUrl: 'http://localhost:4000/api' });

// GET with query params
const users = await webFetch('GET /users', { params: { limit: 10 } });

// POST with a body
const user = await webFetch('POST /users', {
    params: { name: 'John', email: 'john@example.com' },
});

// Path parameters — any `:name` segment is replaced with `params.name`
const one = await webFetch('GET /users/:id', { params: { id: '123' } });
```

Prism servers mount endpoints under `/api/` (see the `server-setup` doc in `@facetlayer/prism-framework`), so `baseUrl` should include the `/api` prefix — or you should use a proxy that rewrites paths onto `/api`.

### Cross-platform fetch

Write UI code against `apiFetch` and swap the transport at startup:

```typescript
import { apiFetch, setFetchImplementation } from '@facetlayer/prism-framework-ui';

// Default: HTTP (no setup needed — apiFetch falls back to webFetch)

// Desktop: replace with Electron IPC
import { createDesktopFetch } from '@facetlayer/prism-framework-desktop';
setFetchImplementation(createDesktopFetch());

// Expo: replace with in-process fetch returned by expoLaunch()
// setFetchImplementation(result.fetch)

// UI code is identical in all three targets:
const items = await apiFetch('GET /items');
```

### Tailwind class helper

```typescript
import { cn } from '@facetlayer/prism-framework-ui';

<button className={cn('px-4 py-2', isActive && 'bg-blue-500', className)} />
```

## Setup Guides

More detailed setup guides are in the `docs/` folder:

- `vite-setup` — Vite + React setup (recommended for local tools and GUIs)
- `nextjs-setup` — Next.js setup notes (QueryClient, monorepo lockfile)

## License

MIT
