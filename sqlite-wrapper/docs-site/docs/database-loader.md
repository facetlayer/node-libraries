# DatabaseLoader

The `DatabaseLoader` class is responsible for initializing and managing the database connection, schema, and migrations.

## Constructor

```typescript
import { DatabaseLoader } from '@facetlayer/sqlite-wrapper';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import { Stream } from '@facetlayer/streams';

const loader = new DatabaseLoader({
    filename: './database.sqlite',
    loadDatabase: await loadBetterSqlite(),
    logs: new Stream(),
    migrationBehavior: 'safe-upgrades',
    schema: {
        name: 'MyDatabase',
        statements: [
            `create table users(id integer primary key, name text)`
        ]
    }
});
```

## Options

### `DatabaseSetupOptions`

| Property | Type | Description |
|----------|------|-------------|
| `filename` | `string` | Path to the SQLite database file |
| `loadDatabase` | `LoadDatabaseFn` | Function to load the better-sqlite3 database |
| `logs` | `Stream` | Stream instance for logging |
| `migrationBehavior` | `MigrationBehavior` | How to handle schema migrations |
| `schema` | `DatabaseSchema` | The database schema definition |
| `onRunStatement` | `(sql, params) => void` | Optional callback for each SQL statement executed |

## Methods

### `load()`

Returns the `SqliteDatabase` instance. On first call, it:

1. Creates the SQLite database connection
2. Applies migrations based on `migrationBehavior`
3. Runs database consistency checks

```typescript
const db: SqliteDatabase = loader.load();
```

Subsequent calls return the cached database instance.

## Example with All Options

```typescript
import { DatabaseLoader } from '@facetlayer/sqlite-wrapper';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import { Stream } from '@facetlayer/streams';

const logs = new Stream();

const loader = new DatabaseLoader({
    filename: './myapp.sqlite',
    loadDatabase: await loadBetterSqlite(),
    logs,
    migrationBehavior: 'full-destructive-updates',
    schema: {
        name: 'MyAppDatabase',
        statements: [
            `create table users(
                id integer primary key,
                name text not null,
                email text unique
            )`,
            `create table sessions(
                id text primary key,
                user_id integer,
                expires_at integer
            )`,
            `create index idx_sessions_user on sessions(user_id)`,
        ],
        initialData: [
            `insert into users(name, email) values('Admin', 'admin@example.com')`
        ]
    },
    onRunStatement: (sql, params) => {
        console.log('Executing:', sql, params);
    }
});

const db = loader.load();
```

## Migration Behavior on Load

When `load()` is called, the behavior depends on the `migrationBehavior` setting:

| Behavior | Actions |
|----------|---------|
| `ignore` | No migration or checks performed |
| `strict` | Only checks schema matches, throws on mismatch |
| `safe-upgrades` | Adds new tables/columns, ignores leftover objects |
| `full-destructive-updates` | Full sync including drops and rebuilds |

See [Migration Behavior](./migration-behavior.md) for detailed information.
