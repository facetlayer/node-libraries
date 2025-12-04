# @facetlayer/sqlite-migration

SQLite schema migration library for detecting and applying schema drifts.

## Features

- Detect schema differences between your database and target schema
- Apply safe migrations (add tables, add nullable columns, create indexes)
- Apply destructive migrations (drop extra tables)
- Retry support for concurrent migration handling
- Works with any SQLite wrapper via the `TargetDatabase` interface

## Installation

```bash
npm install @facetlayer/sqlite-migration
```

## Quick Start

```typescript
import { applyMigration, TargetDatabase, DatabaseSchema } from '@facetlayer/sqlite-migration';

// Implement the TargetDatabase interface for your SQLite wrapper
const db: TargetDatabase = {
  get: async (sql, ...params) => /* execute query, return first row */,
  list: async (sql, ...params) => /* execute query, return all rows */,
  run: async (sql, ...params) => /* execute statement */,
  pragma: async (statement) => /* execute pragma */,
  info: (msg) => console.log(msg),
  warn: (msg) => console.warn(msg),
};

// Define your target schema
const schema: DatabaseSchema = {
  name: 'my-app',
  statements: [
    'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
    'CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT)',
    'CREATE INDEX idx_posts_user_id ON posts(user_id)',
  ],
};

// Apply migrations (safe mode - won't drop tables or columns)
await applyMigration(db, schema, 'safe-updates');

// Or apply all migrations including destructive ones
await applyMigration(db, schema, 'destructive-updates');
```

## API

### `applyMigration(db, schema, migrationType)`

High-level function that detects drifts and applies migrations with retry support for concurrent access.

```typescript
await applyMigration(db, schema, 'safe-updates');      // Safe migrations only
await applyMigration(db, schema, 'destructive-updates'); // All migrations
```

**Parameters:**
- `db: TargetDatabase` - Database interface implementation
- `schema: DatabaseSchema` - Target schema definition
- `migrationType: MigrationType` - Either `'safe-updates'` or `'destructive-updates'`

### `findDatabaseDrift(db, schema)`

Analyzes the database and returns all drifts needed to match the target schema. Use this when you want to inspect what changes will be made before applying them.

```typescript
import { findDatabaseDrift, DatabaseSchema } from '@facetlayer/sqlite-migration';

const schema: DatabaseSchema = {
  name: 'my-app',
  statements: [
    'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
    'CREATE INDEX idx_users_email ON users(email)',
  ],
};

const drift = await findDatabaseDrift(db, schema);

// Inspect drifts by table
for (const [tableName, tableDrift] of drift.tables.entries()) {
  console.log(`Table: ${tableName}`);
  for (const d of tableDrift.drifts) {
    console.log(`  - ${d.type}`, d.columnName || d.indexName || '');
  }
}

// Check warnings
for (const warning of drift.warnings) {
  console.warn(warning);
}
```

**Returns:** `Promise<DatabaseDrift>`

The `DatabaseDrift` object contains:
- `tables: Map<string, TableDrift>` - Drifts organized by table name
- `warnings: string[]` - Warnings about extra tables or unsupported changes

### `generateSafeMigration(dbDrift, schema)`

Generates SQL statements for safe, non-destructive migrations only.

```typescript
import { findDatabaseDrift, generateSafeMigration } from '@facetlayer/sqlite-migration';

const drift = await findDatabaseDrift(db, schema);
const result = generateSafeMigration(drift, schema);

console.log('Statements to execute:', result.statements);
console.log('Skipped (destructive):', result.warnings);
```

**Safe operations include:**
- Creating new tables
- Adding nullable columns
- Creating new indexes

### `generateDestructiveUpdates(dbDrift, schema)`

Generates SQL statements for all migrations, including destructive ones.

```typescript
import { findDatabaseDrift, generateDestructiveUpdates } from '@facetlayer/sqlite-migration';

const drift = await findDatabaseDrift(db, schema);
const result = generateDestructiveUpdates(drift, schema);

console.log('Statements to execute:', result.statements);
console.log('Unsupported operations:', result.warnings);
```

**Destructive operations include:**
- Everything in safe migrations
- Dropping extra tables

**Note:** Table rebuilds and column drops are not yet supported and will generate warnings.

## Types

### `TargetDatabase`

Interface for database operations. All database methods return Promises to support async SQLite wrappers.

```typescript
interface TargetDatabase {
  get(sql: string, ...params: any[]): Promise<Record<string, any> | undefined>;
  list(sql: string, ...params: any[]): Promise<Record<string, any>[]>;
  run(sql: string, ...params: any[]): Promise<void>;
  pragma(statement: string): Promise<void>;
  info(msg: string): void;
  warn(msg: string): void;
}
```

### `DatabaseSchema`

```typescript
interface DatabaseSchema {
  name: string;           // Schema identifier
  statements: string[];   // CREATE TABLE and CREATE INDEX statements
}
```

### `DriftType`

```typescript
type DriftType =
  | 'need_to_create_table'
  | 'need_to_add_column'
  | 'need_to_delete_column'
  | 'need_to_modify_column'
  | 'need_to_rebuild_table'
  | 'need_to_create_index'
  | 'need_to_delete_index'
  | 'extra_table';
```

## Example: Using with better-sqlite3

```typescript
import Database from 'better-sqlite3';
import { applyMigration, TargetDatabase, DatabaseSchema } from '@facetlayer/sqlite-migration';

const sqliteDb = new Database('app.db');

const db: TargetDatabase = {
  get: async (sql, ...params) => sqliteDb.prepare(sql).get(...params),
  list: async (sql, ...params) => sqliteDb.prepare(sql).all(...params),
  run: async (sql, ...params) => { sqliteDb.prepare(sql).run(...params); },
  pragma: async (statement) => { sqliteDb.pragma(statement, { simple: true }); },
  info: (msg) => console.log('[migration]', msg),
  warn: (msg) => console.warn('[migration]', msg),
};

const schema: DatabaseSchema = {
  name: 'my-app',
  statements: [
    'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
  ],
};

await applyMigration(db, schema, 'safe-updates');
```

## Example: Inspecting Drifts Before Applying

```typescript
import { findDatabaseDrift, generateSafeMigration } from '@facetlayer/sqlite-migration';

// Find what needs to change
const drift = await findDatabaseDrift(db, schema);

// Preview the SQL that will be executed
const { statements, warnings } = generateSafeMigration(drift, schema);

console.log('Will execute:');
statements.forEach(sql => console.log(`  ${sql}`));

console.log('Will skip (destructive):');
warnings.forEach(w => console.log(`  ${w}`));

// Now apply if satisfied
await applyMigration(db, schema, 'safe-updates');
```
