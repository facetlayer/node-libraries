# Getting Started

## Installation

```bash
pnpm add @facetlayer/sqlite-wrapper
```

The library uses `better-sqlite3` as the underlying SQLite driver. You'll also need `@facetlayer/streams` for logging:

```bash
pnpm add better-sqlite3 @facetlayer/streams
```

## Initializing the Database

### 1. Define Your Schema

Create a schema object with a list of statements that defines your database.
This should include `create table` and `create index` statements.

Don't use `if not exists` clauses here. The library will parse these statements and will take care of migration.

Example:

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

The DatabaseLoader defines the database's configuration. Once this is set up, you can
call `DatabaseLoader.load()` to get the actual database instance.

Parameters:

| name | description |
| - | - |
| filename | The filename of the SQLite database file. Will be created if it doens't exist |
| loadDatabase | This is a dependency-injection callback for loading the 'better-sqlite' library. |
| migrationBehavior | See [Migration Behavior](./migration-behavior.md) |
| schema | The schema definition from above. |
| logs | A `Stream` object from `@facetlayer/streams` which receives log messages related to the database, including migration events or errors. |

Example:

```typescript
import { DatabaseLoader, SqliteDatabase } from '@facetlayer/sqlite-wrapper';
import { toConsoleLog } from '@facetlayer/streams';
import BetterSqliteDatabase from "better-sqlite3";

const logs = new Stream();

const loader = new DatabaseLoader({
    filename: './db.sqlite',
    loadDatabase: (filename) => new BetterSqliteDatabase(filename),
    migrationBehavior: 'safe-upgrades',
    schema,
    logs: toConsoleLog("[database]"),
});

// Get the database instance
const db = loader.load();
```

### 3. Use the Database

The `load()` function will give you a [SqliteDatabase](./sqlite-database.md) object that you can use.

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


## Next Steps

- Learn about all [SqliteDatabase](./sqlite-database.md) operations
- Understand [Migration Behavior](./migration-behavior.md) options
