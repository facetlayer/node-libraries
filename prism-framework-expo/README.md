# @facetlayer/prism-framework-expo

Expo/React Native integration for Prism Framework applications.

Run the same Prism Framework services and endpoints on mobile — no HTTP server needed. Business logic runs in-process, with endpoints called directly via `callEndpoint()`.

## Installation

```bash
pnpm add @facetlayer/prism-framework-expo @facetlayer/prism-framework
```

For database support:
```bash
npx expo install expo-sqlite
```

## Usage

```typescript
import { App } from '@facetlayer/prism-framework/core';
import { expoLaunch, ExpoSqliteDatabase } from '@facetlayer/prism-framework-expo';
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import * as SQLite from 'expo-sqlite';
import { createUserService, createProjectService } from './services';

// 1. Create the database first so endpoints can close over it
const db = ExpoSqliteDatabase.open(SQLite, 'myapp.db');

// 2. Create services with database access via closure
const app = new App({
  name: 'MyApp',
  services: [createUserService(db), createProjectService(db)],
});

// 3. Launch — pass the pre-created db for schema initialization
const { fetch, shutdown } = await expoLaunch({
  app,
  databases: { main: db },
});

// 4. Wire up the UI fetch layer — now apiFetch() calls endpoints in-process
setFetchImplementation(fetch);
```

The same service definition files work on web, desktop, and mobile with zero changes.

## React Hook

For Expo apps using `_layout.tsx`, the `usePrismApp` hook manages async initialization:

```tsx
import { usePrismApp } from '@facetlayer/prism-framework-expo';
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';

export default function RootLayout() {
  const { isLoading, result, error } = usePrismApp(() => ({
    app,
    databases: { main: db },
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

## API

### `expoLaunch(options)`

Bootstraps a Prism app for Expo. Initializes databases, creates the in-process fetch, and starts background jobs.

**Options:**
- `app` — The PrismApp instance
- `databases` — Map of database name to `ExpoLaunchDatabaseConfig` or pre-created `ExpoSqliteDatabase`
- `getAuth` — Optional function returning an `Authorization` for each request (mobile equivalent of auth middleware)
- `migrationMode` — `'simple'` (default) or `'migrate'` (tracks applied statements)

**Returns:** `{ fetch, databases, shutdown }`

### `createExpoFetch(app, options?)`

Creates an in-process fetch function matching the `webFetch` signature. Parses endpoint strings like `"GET /users/:id"` and calls `app.callEndpoint()` directly.

Each call is wrapped in a `RequestContext` so endpoints can use `getCurrentRequestContext()`.

Error handling matches webFetch: `HttpError` is normalized to `"Fetch error, status: N"`.

**Options:**
- `getAuth` — Optional function returning an `Authorization` for each request

### `ExpoSqliteDatabase`

SQLite adapter wrapping expo-sqlite's synchronous API to match the `PrismDatabase` interface.

- `ExpoSqliteDatabase.open(SQLite, 'myapp.db')` — Create from expo-sqlite module
- `initializeSchema(dbName, services)` — Run all statements (idempotent, simple)
- `migrateSchema(dbName, services)` — Track and run only new statements (safe for updates)

### `ExpoEventEmitter<EventType>`

Mobile equivalent of the web-side SSE `ConnectionManager`. Uses in-process callbacks instead of HTTP SSE connections.

```typescript
const events = new ExpoEventEmitter<{ type: string; data: any }>();

// Subscribe in UI
const unsubscribe = events.subscribe('user-123', (event) => {
  console.log('Got event:', event);
});

// Post from service code (same pattern as ConnectionManager.postEvent)
events.postEvent('user-123', { type: 'update', data: { ... } });

// Clean up
unsubscribe();
```

### `usePrismApp(getLaunchOptions)`

React hook that wraps `expoLaunch()` with loading/error state management. Called once on mount.

Returns `{ isLoading, result, error }`.
