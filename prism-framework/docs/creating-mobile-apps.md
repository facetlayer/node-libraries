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

## Setup

### Install dependencies

```bash
pnpm add @facetlayer/prism-framework @facetlayer/prism-framework-expo @facetlayer/prism-framework-ui
npx expo install expo-sqlite
```

### Import from `/core`

Mobile apps should import from `@facetlayer/prism-framework/core` instead of the main entry point. This avoids pulling in Express and other server-only dependencies.

```typescript
import { App, createEndpoint } from '@facetlayer/prism-framework/core';
```

## Example

### Define services (shared across all platforms)

```typescript
// services/itemsService.ts
import { createEndpoint } from '@facetlayer/prism-framework/core';
import { z } from 'zod';

const listItems = createEndpoint({
  method: 'GET',
  path: '/items',
  responseSchema: z.object({ items: z.array(z.object({ id: z.string(), name: z.string() })) }),
  handler: async () => {
    // Business logic here — same code runs on web and mobile
    return { items: [] };
  },
});

export const itemsService = {
  name: 'items',
  endpoints: [listItems],
};
```

### Bootstrap the Expo app

```typescript
// app/_layout.tsx
import { App } from '@facetlayer/prism-framework/core';
import { expoLaunch } from '@facetlayer/prism-framework-expo';
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import * as SQLite from 'expo-sqlite';
import { itemsService } from '../services/itemsService';

const app = new App({
  name: 'MyApp',
  services: [itemsService],
});

const { fetch, databases } = await expoLaunch({
  app,
  databases: {
    main: { expoSQLite: SQLite },
  },
});

// Wire up the UI fetch layer
setFetchImplementation(fetch);
```

### Use `apiFetch` in UI components

```typescript
import { apiFetch } from '@facetlayer/prism-framework-ui';

// Works identically on web and mobile
const data = await apiFetch('GET /items');
```

## Database Support

`ExpoSqliteDatabase` wraps `expo-sqlite`'s synchronous API (SDK 51+) to match the `PrismDatabase` interface. Service database schemas (the `databases` field on `ServiceDefinition`) are initialized automatically by `expoLaunch()`.

```typescript
const { databases } = await expoLaunch({
  app,
  databases: {
    main: { expoSQLite: SQLite, filename: 'myapp.db' },
  },
});

// Access the database directly if needed
const db = databases.main;
const rows = db.list('SELECT * FROM items');
```

If your service defines database schemas:

```typescript
export const itemsService = {
  name: 'items',
  endpoints: [listItems, createItem],
  databases: {
    main: {
      statements: [
        'CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, name TEXT NOT NULL)',
      ],
    },
  },
};
```

These statements are executed automatically when `expoLaunch()` initializes the database.

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
| Transport | HTTP (Express) | Electron IPC | In-process `callEndpoint()` |
| Database | `better-sqlite3` | `better-sqlite3` | `expo-sqlite` |
| UI fetch | `webFetch` (HTTP) | `window.electron.apiCall` | `createExpoFetch` (direct) |
| Import path | `@facetlayer/prism-framework` | `@facetlayer/prism-framework` | `@facetlayer/prism-framework/core` |
