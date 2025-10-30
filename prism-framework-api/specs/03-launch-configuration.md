# Launch Configuration

The launch configuration system is a crucial feature that allows the same code to work in both backend (Express.js) and desktop (Electron) contexts.

## Why Launch Configuration?

Different execution contexts need different configurations:
- **Backend server**: Database files on disk, specific logging configuration
- **Electron desktop app**: Database files in user data directory, different SQLite loader

The `setLaunchConfig()` function centralizes this configuration and must be called **before** any services access databases or logging.

## Basic Setup

```typescript
import { setLaunchConfig } from '@facetlayer/spark-framework';

setLaunchConfig({
  logging: {
    databaseFilename: '/path/to/logs.db',
    enableConsoleLogging: true,
    loadDatabase: await loadBetterSqlite(),
  },
  database: {
    user: {
      migrationBehavior: 'safe-upgrades',
      databasePath: '/path/to/databases',
      services: ALL_SERVICES,
      loadDatabase: await loadBetterSqlite(),
    },
  },
});
```

## Configuration Structure

### Logging Configuration

```typescript
interface LoggingSettings {
  databaseFilename: string;        // Path to logging database
  enableConsoleLogging: boolean;   // Also log to console
  loadDatabase: LoadDatabaseFn;    // Database loader function
}
```

### Database Configuration

```typescript
interface DatabaseInitializationOptions {
  migrationBehavior: MigrationBehavior;  // How to handle schema changes
  databasePath: string;                  // Directory for database files
  services: ServiceDefinition[];         // Services to include schemas from
  loadDatabase: LoadDatabaseFn;          // Database loader function
}
```

### Migration Behavior

```typescript
type MigrationBehavior =
  | 'safe-upgrades'      // Only allow adding columns/tables
  | 'rebuild'            // Drop and recreate on mismatch
  | 'error-on-mismatch'; // Throw error on schema mismatch
```

## Backend Server Example

```typescript
// main.ts (backend server)
import { setLaunchConfig, startServer } from '@facetlayer/spark-framework';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import path from 'path';
import fs from 'fs';

async function main() {
  const databasePath = process.env.SQLITE_DATABASE_PATH || './databases';

  // Ensure directory exists
  if (!fs.existsSync(databasePath)) {
    fs.mkdirSync(databasePath, { recursive: true });
  }

  // Configure for backend
  setLaunchConfig({
    logging: {
      databaseFilename: path.join(databasePath, 'logs.db'),
      enableConsoleLogging: true,
      loadDatabase: await loadBetterSqlite(),
    },
    database: {
      user: {
        migrationBehavior: 'safe-upgrades',
        databasePath,
        services: ALL_SERVICES,
        loadDatabase: await loadBetterSqlite(),
      },
    },
  });

  // Start server
  await startServer({ services: ALL_SERVICES });
}

main().catch(console.error);
```

## Electron Desktop App Example

```typescript
// main.ts (Electron main process)
import { app } from 'electron';
import { setLaunchConfig } from '@facetlayer/spark-framework';
import { getSqliteLoader } from './database-helper';
import path from 'path';

async function initializeApp() {
  await app.whenReady();

  const userDataPath = app.getPath('userData');
  const databasePath = path.join(userDataPath, 'databases');

  // Get Electron-compatible SQLite loader
  const loadDatabase = await getSqliteLoader();

  // Configure for Electron
  setLaunchConfig({
    logging: {
      databaseFilename: path.join(databasePath, 'logs.db'),
      enableConsoleLogging: true,
      loadDatabase,
    },
    database: {
      'desktop-app': {
        migrationBehavior: 'safe-upgrades',
        databasePath,
        services: ALL_SERVICES,
        loadDatabase,
      },
    },
  });

  // Continue with Electron app initialization...
}
```

## Accessing Configuration

Services and framework code can access the configuration:

```typescript
import {
  getLaunchConfig,
  getDatabaseConfig,
  getLoggingConfig
} from '@facetlayer/spark-framework';

// Get full config
const config = getLaunchConfig();

// Get database config for a specific database
const userDbConfig = getDatabaseConfig('user');

// Get logging config
const loggingConfig = getLoggingConfig();
```

## Multiple Databases

You can configure multiple databases:

```typescript
setLaunchConfig({
  logging: { /* ... */ },
  database: {
    user: {
      migrationBehavior: 'safe-upgrades',
      databasePath: '/path/to/databases',
      services: ALL_SERVICES.filter(s => s.databases?.user),
      loadDatabase: await loadBetterSqlite(),
    },
    project: {
      migrationBehavior: 'safe-upgrades',
      databasePath: '/path/to/databases',
      services: ALL_SERVICES.filter(s => s.databases?.project),
      loadDatabase: await loadBetterSqlite(),
    },
    'desktop-app': {
      migrationBehavior: 'rebuild',
      databasePath: '/path/to/databases',
      services: ALL_SERVICES.filter(s => s.databases?.['desktop-app']),
      loadDatabase: await loadBetterSqlite(),
    },
  },
});
```

## Database Statements Collection

The framework automatically collects SQL statements from all services:

```typescript
import { getStatementsForDatabase } from '@facetlayer/spark-framework';

const statements = getStatementsForDatabase('user', ALL_SERVICES);
// Returns all SQL statements from services that define databases.user
```

This is used internally when initializing databases with `@facetlayer/sqlite-wrapper`.

## Best Practices

1. **Call setLaunchConfig early** - Before any database or logging operations
2. **Call it only once** - The function throws if called multiple times
3. **Use environment variables** - Make paths configurable
4. **Ensure directories exist** - Create database directories before setting config
5. **Use appropriate migration behavior** - `safe-upgrades` for production, `rebuild` for development
