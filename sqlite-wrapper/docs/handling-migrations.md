# Handling Migrations #

The sqlite-wrapper library provides automatic schema migration that detects and applies database changes when your schema evolves. For most common operations like adding new columns, you don't need to write any `ALTER TABLE` commands manually.

## How It Works ##

When your database loads, the library compares the actual database schema against the schema defined in your code. It detects differences ("drifts") and applies migrations automatically based on your configuration.

The library queries SQLite's internal `sqlite_schema` table to get the current database structure, then compares it against your schema statements to identify:

- Missing tables that need to be created
- Missing columns that need to be added
- Missing indexes that need to be created
- Schema changes that require table rebuilds

## Adding New Columns ##

For simple schema changes like adding a new nullable column, the library handles everything automatically. You don't need to write `ALTER TABLE` statements.

**Example:** Adding a new column to an existing table.

Before:
```javascript
schema: {
    statements: [
        `create table users(
            user_id integer primary key,
            name text
        )`
    ]
}
```

After:
```javascript
schema: {
    statements: [
        `create table users(
            user_id integer primary key,
            name text,
            email text
        )`
    ]
}
```

When the database loads, the library detects that `email` is missing and runs:
```sql
ALTER TABLE users ADD COLUMN email text
```

No manual migration scripts required.

## Migration Behavior Options ##

The `DatabaseLoader` constructor accepts a `migration` object to control how migrations are applied:

```javascript
let _db = new DatabaseLoader({
    filename: './something.sqlite',
    schema: { /* ... */ },
    migration: {
        safeMigrate: true,           // Default: true
        dropLeftoverTables: false,   // Default: false
        doDestructiveRebuilds: false // Default: false
    }
});
```

### Safe Migrations (Default) ###

With the default settings (`safeMigrate: true`), the library automatically handles:

- **Creating new tables** - Tables in your schema that don't exist in the database
- **Adding nullable columns** - New columns without `NOT NULL` constraints
- **Creating indexes** - New indexes defined in your schema

These operations are safe because they don't modify or delete existing data.

### Destructive Operations ###

Some schema changes require destructive operations that can result in data loss:

- **Removing columns** - Columns in the database but not in the schema
- **Modifying column definitions** - Changing types or constraints
- **Adding NOT NULL columns** - Requires table rebuild
- **Removing tables** - Tables in the database but not in the schema

By default, destructive operations are skipped and warnings are logged. To enable them:

```javascript
migration: {
    doDestructiveRebuilds: true,  // Enable table rebuilds
    dropLeftoverTables: true      // Enable dropping extra tables
}
```

## Table Rebuild Process ##

When schema changes cannot be done with simple `ALTER TABLE` commands (like adding a `NOT NULL` column or modifying a column type), the library performs an automatic table rebuild:

1. Creates a new table with a temporary name using the updated schema
2. Copies all existing data from the old table to the new table
3. Drops the old table
4. Renames the temporary table to the original name
5. Recreates any indexes

This process preserves existing data while applying the new schema.

## Concurrent Access ##

The migration system handles race conditions when multiple processes try to migrate the same database simultaneously. If a migration fails with a "table already exists" or "duplicate column" error, the library retries automatically.

## Recommended Workflow ##

**Development:** Enable all migrations for convenience:
```javascript
migration: {
    safeMigrate: true,
    doDestructiveRebuilds: true,
    dropLeftoverTables: true
}
```

**Production:** Use safe migrations only (the default):
```javascript
migration: {
    safeMigrate: true
}
```

For production deployments that require destructive changes, consider running migrations manually or during a maintenance window with explicit backup procedures.
