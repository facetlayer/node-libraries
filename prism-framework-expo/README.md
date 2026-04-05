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
const { fetch } = await expoLaunch({
  app,
  databases: { main: db },
});

// 4. Wire up the UI fetch layer — now apiFetch() calls endpoints in-process
setFetchImplementation(fetch);
```

The same service definition files work on web, desktop, and mobile with zero changes.

## API

### `expoLaunch(options)`

Bootstraps a Prism app for Expo. Initializes databases, creates the in-process fetch, and starts background jobs.

The `databases` option accepts either config objects (to create new databases) or pre-created `ExpoSqliteDatabase` instances. Use pre-created instances when your endpoints need database access via closures.

### `createExpoFetch(app)`

Creates an in-process fetch function matching the `webFetch` signature. Parses endpoint strings like `"GET /users/:id"` and calls `app.callEndpoint()` directly.

### `ExpoSqliteDatabase`

SQLite adapter wrapping expo-sqlite's synchronous API to match the `PrismDatabase` interface.
