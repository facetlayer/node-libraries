# API Reference

## `getUserdataDatabase(options)`

Creates and initializes a SQLite database in the user's home directory.

```typescript
import { getUserdataDatabase } from '@facetlayer/userdata-db'

const db = getUserdataDatabase({
  appName: 'my-app',
  schema: {
    name: 'my-db',
    statements: ['CREATE TABLE ...']
  },
  migrationBehavior: 'safe-upgrades'
})
```

### Options

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `appName` | `string` | Yes | - | Application name, used for directory naming |
| `schema` | `DatabaseSchema` | Yes | - | Database schema definition |
| `migrationBehavior` | `MigrationBehavior` | No | `'safe-upgrades'` | How to handle schema changes |
| `logs` | `Stream` | No | `new Stream()` | Custom logging stream |

### Returns

Returns a `SqliteDatabase` instance from `@facetlayer/sqlite-wrapper`.

---

## `getStateDirectory(appName)`

Returns the state directory path for an application without creating it.

```typescript
import { getStateDirectory } from '@facetlayer/userdata-db'

const dir = getStateDirectory('my-app')
// Returns: ~/.local/state/my-app (or custom path based on env vars)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `appName` | `string` | Application name |

### Returns

`string` - The resolved directory path.

### Resolution Order

1. `{APPNAME}_STATE_DIR` environment variable (e.g., `MY_APP_STATE_DIR`)
2. `$XDG_STATE_HOME/{appName}`
3. `~/.local/state/{appName}` (default)

---

## `getOrCreateStateDirectory(appName)`

Returns the state directory path and creates it if it doesn't exist.

```typescript
import { getOrCreateStateDirectory } from '@facetlayer/userdata-db'

const dir = getOrCreateStateDirectory('my-app')
// Creates ~/.local/state/my-app if needed, then returns the path
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `appName` | `string` | Application name |

### Returns

`string` - The resolved directory path (guaranteed to exist).

---

## Types

### `GetUserdataDatabaseOptions`

```typescript
interface GetUserdataDatabaseOptions {
  appName: string
  schema: DatabaseSchema
  migrationBehavior?: 'ignore' | 'strict' | 'safe-upgrades' | 'full-destructive-updates'
  logs?: Stream
}
```

### `DatabaseSchema`

Re-exported from `@facetlayer/sqlite-wrapper`:

```typescript
interface DatabaseSchema {
  name: string
  statements: string[]
  initialData?: string[]
}
```

### `SqliteDatabase`

Re-exported from `@facetlayer/sqlite-wrapper`. See the [sqlite-wrapper documentation](https://facetlayer.github.io/sqlite-wrapper/sqlite-database) for full details.

Key methods:
- `get(sql, params?)` - Get first matching row
- `list(sql, params?)` - Get all matching rows
- `run(sql, params?)` - Execute a statement
- `insert(table, row)` - Insert a row
- `update(table, where, row)` - Update rows
- `upsert(table, where, row)` - Update or insert
- `exists(sql, params?)` - Check if rows exist
- `count(sql, params?)` - Count matching rows
- `close()` - Close the database

### `MigrationBehavior`

```typescript
type MigrationBehavior =
  | 'ignore'                  // No migration checks
  | 'strict'                  // Verify schema matches exactly
  | 'safe-upgrades'           // Apply safe migrations only (default)
  | 'full-destructive-updates' // Apply all migrations
```

See [Schema Migration](./migration.md) for details on each mode.
