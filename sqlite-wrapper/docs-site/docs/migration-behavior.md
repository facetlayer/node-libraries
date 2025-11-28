# Migration Behavior

The `MigrationBehavior` type controls how schema migrations are handled when the database is loaded.

## Available Options

### `strict`

**Recommended for: Production**

- Does not perform any migrations.
- Throws an error on startup if the existing database schema doesn't match the expected schema.
- You'll need to take care of database migrations in some other way.

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


**Recommended for: Tools that access the database**

```typescript
const loader = new DatabaseLoader({
    // ...
    migrationBehavior: 'ignore',
});
```
