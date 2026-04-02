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
import { expoLaunch } from '@facetlayer/prism-framework-expo';
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import * as SQLite from 'expo-sqlite';
import { userService, projectService } from './services';

const app = new App({
  name: 'MyApp',
  services: [userService, projectService],
});

const { fetch, databases } = await expoLaunch({
  app,
  databases: {
    main: { expoSQLite: SQLite },
  },
});

// Wire up the UI fetch layer — now apiFetch() calls endpoints in-process
setFetchImplementation(fetch);
```

The same service definition files work on web, desktop, and mobile with zero changes.

## API

### `expoLaunch(options)`

Bootstraps a Prism app for Expo. Initializes databases, creates the in-process fetch, and starts background jobs.

### `createExpoFetch(app)`

Creates an in-process fetch function matching the `webFetch` signature. Parses endpoint strings like `"GET /users/:id"` and calls `app.callEndpoint()` directly.

### `ExpoSqliteDatabase`

SQLite adapter wrapping expo-sqlite's synchronous API to match the `PrismDatabase` interface.
