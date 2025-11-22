# Schema Migration

The library supports automatic schema migrations through the `migrationBehavior` option.

## Migration Modes

### `safe-upgrades` (Default)

Only applies safe, non-destructive changes:

```typescript
const db = getUserdataDatabase({
  appName: 'my-app',
  schema,
  migrationBehavior: 'safe-upgrades'
})
```

**What it does:**
- Creates new tables that don't exist
- Adds new columns to existing tables
- Creates new indexes

**What it ignores:**
- Tables in the database but not in the schema
- Columns in the database but not in the schema
- Changes that require table rebuilds

**Best for:** Production and staging environments where you want automatic safe updates.

### `strict`

Verifies the schema matches exactly, but doesn't make any changes:

```typescript
const db = getUserdataDatabase({
  appName: 'my-app',
  schema,
  migrationBehavior: 'strict'
})
```

**What it does:**
- Throws an error if the database schema doesn't match

**Best for:** Production environments where schema changes should be controlled externally.

### `full-destructive-updates`

Applies all migrations to make the database match the schema exactly:

```typescript
const db = getUserdataDatabase({
  appName: 'my-app',
  schema,
  migrationBehavior: 'full-destructive-updates'
})
```

**What it does:**
- Everything `safe-upgrades` does
- Drops tables not in the schema
- Drops columns not in the schema
- Rebuilds tables when necessary (for column type changes, etc.)

**Warning:** This can result in data loss!

**Best for:** Development and testing where you want the database to always match your schema.

### `ignore`

Skips all migration checks:

```typescript
const db = getUserdataDatabase({
  appName: 'my-app',
  schema,
  migrationBehavior: 'ignore'
})
```

**Best for:** Read-only access or when you manage migrations externally.

## Choosing the Right Mode

| Environment | Recommended | Reason |
|-------------|-------------|--------|
| Local Development | `full-destructive-updates` | Always matches current schema |
| Automated Tests | `full-destructive-updates` | Fresh schema each run |
| CI/CD | `safe-upgrades` | Safe automatic updates |
| Staging | `safe-upgrades` | Test migrations safely |
| Production | `strict` or `safe-upgrades` | Controlled changes |

## Example: Environment-Based Configuration

```typescript
import { getUserdataDatabase, MigrationBehavior } from '@facetlayer/userdata-db'

function getMigrationBehavior(): MigrationBehavior {
  if (process.env.NODE_ENV === 'test') {
    return 'full-destructive-updates'
  }
  if (process.env.NODE_ENV === 'production') {
    return 'strict'
  }
  return 'safe-upgrades'
}

const db = getUserdataDatabase({
  appName: 'my-app',
  schema,
  migrationBehavior: getMigrationBehavior()
})
```

## Initial Data

You can include initial data that's inserted when tables are first created:

```typescript
const schema = {
  name: 'config-db',
  statements: [
    `CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)`
  ],
  initialData: [
    `INSERT INTO settings (key, value) VALUES ('version', '1.0.0')`,
    `INSERT INTO settings (key, value) VALUES ('theme', 'dark')`
  ]
}
```

Initial data statements are only executed if the target table is empty, preventing duplicate inserts on subsequent runs.

## Related

For more details on migration behavior, see the [sqlite-wrapper Migration Behavior documentation](https://facetlayer.github.io/sqlite-wrapper/migration-behavior).
