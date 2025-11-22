# Migration Behavior

The `MigrationBehavior` type controls how schema migrations are handled when the database is loaded.

## Available Modes

### `strict`

**Recommended for: Production**

- Does not perform any automatic migrations
- Throws an error on startup if the existing database schema doesn't match the expected schema
- Any schema migrations must be done manually, in a separate step

```typescript
const loader = new DatabaseLoader({
    // ...
    migrationBehavior: 'strict',
});
```

Use this in production to ensure schema changes are intentional and controlled.

### `safe-upgrades`

**Recommended for: Preprod / Staging**

- Performs only safe, non-destructive migrations automatically
- "Safe" migrations include:
  - Adding new tables (if they don't exist)
  - Adding new columns (if they don't exist)
  - Adding new indexes (if they don't exist)
- Ignores any leftover tables or columns that are in the database but not in the current schema
- Ignores any destructive migrations that would require a table rebuild

```typescript
const loader = new DatabaseLoader({
    // ...
    migrationBehavior: 'safe-upgrades',
});
```

This mode allows you to add new features without risking data loss from removed columns or tables.

### `full-destructive-updates`

**Recommended for: Local development / Automated testing**

- Performs all migrations to match the current schema, including destructive operations
- Drops leftover tables that are not in the current schema
- Will perform ALTER TABLE operations as needed to match the current schema
- If a change can't be done with ALTER TABLE, the library will perform a table rebuild:
  - Creates a new table with the latest schema
  - Migrates every row over
  - Drops the old table
- **Warning:** Can result in data loss if existing data doesn't fit the new schema

```typescript
const loader = new DatabaseLoader({
    // ...
    migrationBehavior: 'full-destructive-updates',
});
```

Use this mode when you want the database to always match your schema exactly, typically during development.

### `ignore`

- No migration or checks performed
- The database is used as-is

```typescript
const loader = new DatabaseLoader({
    // ...
    migrationBehavior: 'ignore',
});
```

## Choosing the Right Mode

| Environment | Recommended Mode | Reason |
|-------------|------------------|--------|
| Production | `strict` | Prevents accidental schema changes |
| Staging/Preprod | `safe-upgrades` | Allows safe additions, prevents data loss |
| Development | `full-destructive-updates` | Always matches current schema |
| Testing | `full-destructive-updates` | Fresh schema for each test run |
| Read-only access | `ignore` | No modifications needed |

## Example: Environment-Based Configuration

```typescript
import { MigrationBehavior } from '@facetlayer/sqlite-wrapper';

function getMigrationBehavior(): MigrationBehavior {
    switch (process.env.NODE_ENV) {
        case 'production':
            return 'strict';
        case 'staging':
            return 'safe-upgrades';
        default:
            return 'full-destructive-updates';
    }
}

const loader = new DatabaseLoader({
    filename: './database.sqlite',
    loadDatabase: await loadBetterSqlite(),
    logs,
    migrationBehavior: getMigrationBehavior(),
    schema,
});
```
