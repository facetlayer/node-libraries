# Getting Started

## Installation

```bash
pnpm add @facetlayer/sqlite-wrapper
```

The library uses `better-sqlite3` as the underlying SQLite driver. You'll also need `@facetlayer/streams` for logging:

```bash
pnpm add better-sqlite3 @facetlayer/streams
```

## Basic Setup

### 1. Define Your Schema

Create a schema object that describes your database tables:

```typescript
import { DatabaseSchema } from '@facetlayer/sqlite-wrapper';

const schema: DatabaseSchema = {
    name: 'MyAppDatabase',
    statements: [
        `create table users(
            id integer primary key,
            name text not null,
            email text unique,
            created_at integer
        )`,
        `create table posts(
            id integer primary key,
            user_id integer not null,
            title text not null,
            content text,
            foreign key (user_id) references users(id)
        )`,
        `create index idx_posts_user on posts(user_id)`,
    ]
};
```

### 2. Create the Database Loader

```typescript
import { DatabaseLoader, SqliteDatabase } from '@facetlayer/sqlite-wrapper';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import { Stream } from '@facetlayer/streams';

const logs = new Stream();

const loader = new DatabaseLoader({
    filename: './myapp.sqlite',
    loadDatabase: await loadBetterSqlite(),
    logs,
    migrationBehavior: 'safe-upgrades',
    schema,
});

// Get the database instance
const db = loader.load();
```

### 3. Use the Database

```typescript
// Insert a user
db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    created_at: Date.now()
});

// Query users
const user = db.get('select * from users where email = ?', ['john@example.com']);

// List all users
const users = db.list('select * from users');

// Count users
const count = db.count('from users');

// Check if user exists
const exists = db.exists('from users where email = ?', ['john@example.com']);
```

## Singleton Pattern

A common pattern is to create a singleton accessor for your database:

```typescript
import { DatabaseLoader, SqliteDatabase } from '@facetlayer/sqlite-wrapper';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import { Stream } from '@facetlayer/streams';

let _loader: DatabaseLoader | null = null;

export async function getDatabase(): Promise<SqliteDatabase> {
    if (!_loader) {
        const logs = new Stream();
        _loader = new DatabaseLoader({
            filename: './myapp.sqlite',
            loadDatabase: await loadBetterSqlite(),
            logs,
            migrationBehavior: 'safe-upgrades',
            schema: {
                name: 'MyAppDatabase',
                statements: [
                    // Your schema here
                ]
            }
        });
    }
    return _loader.load();
}
```

## Migration Behavior

The library supports different migration behaviors depending on your environment:

- **`strict`** - No automatic migrations, throws on schema mismatch (production)
- **`safe-upgrades`** - Only safe migrations like adding tables/columns (preprod)
- **`full-destructive-updates`** - Full sync including destructive changes (development)

See [Migration Behavior](./migration-behavior.md) for more details.

## Next Steps

- Learn about all [SqliteDatabase](./sqlite-database.md) operations
- Understand [Migration Behavior](./migration-behavior.md) options
- Explore [DatabaseLoader](./database-loader.md) configuration
