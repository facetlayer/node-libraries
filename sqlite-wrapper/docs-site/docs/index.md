# sqlite-wrapper

Helper wrapper around SQLite with schema management and migrations.

## Features

**Database creation and schema management:**

- Autocreates and initializes the database if the `.sqlite` file doesn't exist yet.
- Understands how to do database migrations when the schema changes.
- Automatically does non-destructive migrations.
- Has functions (not automatically called) to do destructive migrations and table rebuilds.

**Database usage:**

- Has convenient wrappers for some typical SQL operations.

## Implementation

Uses the **`better-sqlite3`** library as the underlying layer to access SQL. This means that all database access operations are synchronous instead of `async` (check their project to read more about the motivations for this).

## Installation

```bash
npm install @facetlayer/sqlite-wrapper
```

Or using other package managers:

```bash
# pnpm
pnpm add @facetlayer/sqlite-wrapper

# yarn
yarn add @facetlayer/sqlite-wrapper
```

## Quick Start

Create a new database:

```typescript
import { DatabaseLoader, SqliteDatabase } from '@facetlayer/sqlite-wrapper';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import { Stream } from '@facetlayer/streams';

const logs = new Stream();

let _db = new DatabaseLoader({
    filename: './something.sqlite',
    loadDatabase: await loadBetterSqlite(),
    logs,
    migrationBehavior: 'safe-upgrades',
    schema: {
        name: 'SomethingDatabase',
        statements: [
            `create table some_table(
                id integer primary key,
                name text
            )`,
        ]
    }
});

export function getDatabase(): SqliteDatabase {
    return _db.load();
}
```

Use the database:

```typescript
const db = getDatabase();
const user = db.get(`select * from user_table where user_id = ?`, [userId]);
```

## Next Steps

- **[Getting Started Guide](./getting-started.md)** - Complete setup instructions and basic usage patterns
- **[Migration Behavior](./migration-behavior.md)** - Understand migration options
- **[SqliteDatabase](./sqlite-database.md)** - Helper class for using the database
