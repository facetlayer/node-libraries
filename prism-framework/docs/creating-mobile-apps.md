---
name: creating-mobile-apps
description: How to run a Prism Framework app as an Expo/React Native mobile app
---

# Creating Mobile Apps

Prism Framework apps can run on mobile using Expo/React Native via the `@facetlayer/prism-framework-expo` package. Your services and endpoints run in-process on the device — no HTTP server needed.

The same service definitions work on web, desktop, and mobile with zero changes.

## How It Works

On web, the UI calls endpoints over HTTP. On desktop, it uses Electron IPC. On mobile, the "server" runs in the same JavaScript process as the UI, so endpoints are called directly via `callEndpoint()`.

The `@facetlayer/prism-framework-expo` package provides:

- **`expoLaunch()`** — bootstraps the app, initializes databases, creates the in-process fetch
- **`createExpoFetch()`** — in-process fetch that replaces HTTP-based `webFetch`
- **`ExpoSqliteDatabase`** — SQLite adapter wrapping `expo-sqlite` for the `PrismDatabase` interface
- **`ExpoEventEmitter`** — in-process event broadcasting (mobile equivalent of SSE)
- **`usePrismApp()`** — React hook for managing async initialization

## Setup

### Install dependencies

```bash
pnpm add @facetlayer/prism-framework @facetlayer/prism-framework-expo @facetlayer/prism-framework-ui
npx expo install expo-sqlite
```

### Import from `/core`

Mobile apps should import from `@facetlayer/prism-framework/core` instead of the main entry point. This avoids pulling in Express and other server-only dependencies.

```typescript
import { App, createEndpoint, Authorization } from '@facetlayer/prism-framework/core';
```

## Example

### Define services (shared across all platforms)

```typescript
// services/itemsService.ts
import { createEndpoint, type PrismDatabase, type ServiceDefinition } from '@facetlayer/prism-framework/core';
import { z } from 'zod';

export function createItemsService(db: PrismDatabase): ServiceDefinition {
  const listItems = createEndpoint({
    method: 'GET',
    path: '/items',
    responseSchema: z.array(z.object({ id: z.number(), name: z.string() })),
    handler: async () => db.list('SELECT id, name FROM items'),
  });

  return {
    name: 'items',
    endpoints: [listItems],
    databases: {
      main: {
        statements: [
          'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
        ],
      },
    },
  };
}
```

### Bootstrap with the React hook

```tsx
// app/_layout.tsx
import React, { useEffect } from 'react';
import { App } from '@facetlayer/prism-framework/core';
import { usePrismApp, ExpoSqliteDatabase } from '@facetlayer/prism-framework-expo';
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import * as SQLite from 'expo-sqlite';
import { createItemsService } from '../services/itemsService';

const db = ExpoSqliteDatabase.open(SQLite, 'myapp.db');
const app = new App({ name: 'MyApp', services: [createItemsService(db)] });

export default function RootLayout() {
  const { isLoading, result, error } = usePrismApp(() => ({
    app,
    databases: { main: db },
    migrationMode: 'migrate',
  }));

  useEffect(() => {
    if (result) setFetchImplementation(result.fetch);
    return () => result?.shutdown();
  }, [result]);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  return <MainApp />;
}
```

### Use `apiFetch` in UI components

```typescript
import { apiFetch } from '@facetlayer/prism-framework-ui';

// Works identically on web and mobile
const data = await apiFetch('GET /items');
```

## Database Support

`ExpoSqliteDatabase` wraps `expo-sqlite`'s synchronous API (SDK 51+) to match the `PrismDatabase` interface.

### Simple mode (default)

All statements run every time. Works well when statements are idempotent (`CREATE TABLE IF NOT EXISTS`).

### Migration mode

Tracks applied statements in a `_prism_migrations` table. Only new statements run. Use this for app updates where the schema may change:

```typescript
const { fetch } = await expoLaunch({
  app,
  databases: { main: db },
  migrationMode: 'migrate',
});
```

### Database access in endpoints

Create the database before defining services so endpoints can close over it:

```typescript
const db = ExpoSqliteDatabase.open(SQLite, 'myapp.db');
const service = createMyService(db); // endpoints close over db
const app = new App({ services: [service] });
const { fetch } = await expoLaunch({ app, databases: { main: db } });
```

## Authorization

On web, auth comes through Express middleware (cookies, headers). On mobile, use the `getAuth` option:

```typescript
import { Authorization } from '@facetlayer/prism-framework/core';

const { fetch } = await expoLaunch({
  app,
  getAuth: () => {
    const auth = new Authorization();
    auth.setUserPermissions({ userId: currentUser.id, permissions: ['read', 'write'] });
    return auth;
  },
});
```

Endpoint handlers can then use `getCurrentRequestContext()` to check auth, just like on web.

## Real-time Events

The web side uses SSE (`ConnectionManager`) for real-time updates. On mobile, use `ExpoEventEmitter`:

```typescript
import { ExpoEventEmitter } from '@facetlayer/prism-framework-expo';

const events = new ExpoEventEmitter<{ type: string; data: any }>();

// In service code
events.postEvent('user-123', { type: 'note-created', data: note });

// In UI
const unsubscribe = events.subscribe('user-123', (event) => {
  // Update state
});
```

## Making UI Code Platform-Agnostic

Use `apiFetch` from `@facetlayer/prism-framework-ui` instead of `webFetch`. It delegates to whichever transport is active:

- **Web**: defaults to HTTP fetch (no setup needed)
- **Mobile**: uses the in-process fetch after calling `setFetchImplementation()`

This means your React components work on both platforms without conditional imports.

## Middleware

Express middleware defined on services is ignored on mobile (a warning is logged). Middleware is transport-specific — use endpoint-level logic for cross-platform concerns like authorization.

## Comparison of Targets

| | Web | Desktop | Mobile |
|---|---|---|---|
| Package | `prism-framework` | `prism-framework-desktop` | `prism-framework-expo` |
| Transport | HTTP (Express) | Electron IPC (or a loopback Express server) | In-process `callEndpoint()` |
| Database | `node:sqlite` | `node:sqlite` | `expo-sqlite` |
| UI fetch | `webFetch` (HTTP) | `createDesktopFetch` (via `window.electron.apiCall`) | `createExpoFetch` (direct) |
| Events | SSE `ConnectionManager` | SSE `ConnectionManager` (Option B only) | `ExpoEventEmitter` |
| Auth | Express middleware | `getAuth` option on `desktopLaunch` | `getAuth` option on `expoLaunch` |
| Import path | `@facetlayer/prism-framework` | `@facetlayer/prism-framework` and `@facetlayer/prism-framework/core` | `@facetlayer/prism-framework/core` |
