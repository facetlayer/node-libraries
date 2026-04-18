
# sqlite-wrapper #

Helper wrapper around SQLite

# Features #

Database creation and schema management:

 - Autocreates and initializes the database if the .sqlite file doesn't exist yet.
 - Understands how to do database migrations when the schema changes.
 - Automatically does non-destructive migrations.
 - Has functions (not automatically called) to do destructive migrations and table rebuilds.

Database usage:

 - Has convenient wrappers for some typical SQL operations.

# Implementation #

Uses the built-in **`node:sqlite`** module (Node.js 22+) as the underlying layer to access
SQLite. All database access operations are synchronous.

# Usage #

Create a new database:

```typescript
import { DatabaseLoader, SqliteDatabase } from '@facetlayer/sqlite-wrapper';

let _dbLoader: DatabaseLoader | null = null;

export function getDatabase(): SqliteDatabase {
    if (!_dbLoader) {
        _dbLoader = new DatabaseLoader({
            filename: './something.sqlite',
            schema: {
                name: 'SomethingDatabase',
                statements: [
                    `create table some_table(
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL
                    )`,
                ]
            },
            logs: {
                info: (msg) => console.log('[DB]', msg),
                warn: (msg) => console.warn('[DB]', msg),
                error: (err) => console.error('[DB]', err.errorMessage),
            },
            migrationBehavior: 'safe-upgrades'
        });
    }
    return _dbLoader.load();
}
```

Use the database:

```typescript
const db = getDatabase();
const user = db.get(`select * from user_table where user_id = ?`, [user_id]);
```

### DatabaseLoader Options

The `DatabaseLoader` constructor requires the following options:

- `filename` (string): Path to the SQLite database file
- `schema` (DatabaseSchema): Object with `name` and `statements` array
- `logs` (DatabaseLogs, optional): Object with logging callbacks: `{ info(msg), warn(msg), error(err) }`
- `logsStream` (Stream, optional): A Stream instance from `@facetlayer/streams` for logging (alternative to `logs`)
- `migrationBehavior` (MigrationBehavior): One of `'ignore'`, `'strict'`, `'safe-upgrades'`, or `'full-destructive-updates'`

Provide either `logs` or `logsStream` to enable logging. If both are provided, `logsStream` takes precedence. If neither is provided, logging is silently disabled.

# API #

### DatabaseLoader

Class that defines the filename and schema.

Will load the SQLite database as soon as you call `DatabaseLoader.load()`

When the table is first loaded, the library will automatically do non-destructive
migration to the latest schema.

##### Migration Options

The `DatabaseLoader` constructor accepts an optional `migration` object in `SetupOptions` to control migration behavior:

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

**Migration Options:**

- `safeMigrate` (boolean, default: true) - Enables the standard migration behavior using `migrateToSchema()`. When disabled, no automatic migrations are performed.

- `dropLeftoverTables` (boolean, default: false) - When enabled, automatically drops any tables or indexes found in the database that are not defined in the current schema. This helps clean up old database objects after schema changes.

- `doDestructiveRebuilds` (boolean, default: false) - When enabled, automatically performs destructive migrations and table rebuilds when schema differences require them. This includes operations like:
  - Dropping columns that no longer exist in the schema
  - Changing column definitions that require rebuilding the table
  - Other schema changes that cannot be done with simple ALTER TABLE statements

**Warning:** Use `dropLeftoverTables` and `doDestructiveRebuilds` with caution as they can result in data loss. Always backup your database before enabling these options.

##### DatabaseLoader.load()

Returns a SqliteDatabase instance.

### SqliteDatabase

Wrapper object over the `node:sqlite` DatabaseSync instance.

##### SqliteDatabase.get(sql, params)

Runs the `select` command and returns the first row that matches, or null.

##### SqliteDatabase.list(sql, params)

Runs the `select` command and returns all rows that match as an array.

##### SqliteDatabase.each(sql, params)

Runs the `select` command and returns an iterator for all matching rows.

##### SqliteDatabase.exists(sql, params)

Convenience function that runs SQL: `select exists(select 1 ${sql})`.

Returns a boolean if any rows matched the condition.

The `sql` string should look like `from <table> where ...`

##### SqliteDatabase.count(sql, params)

Convenience function that runs SQL: `select count(*) ${sql}` and returns the `count(*)` result.

The `sql` string should look like `from <table> where ...`

##### SqliteDatabase.insert(tableName, row: Record<string,any>)

Convenience function that builds an `insert` statement.

The SQL statement will look like `insert into <tableName> (...) values (...)`

The columns & values will be built using the `row` object, which
is plain object where each field is a column name.

##### SqliteDatabase.update(tableName, whereClause, row)

Convenience function that builds an `update` statement.

**Parameters:**
- `tableName` (string): The name of the table to update
- `whereClause` (object): Object specifying the WHERE conditions, where each key is a column name and value is the expected value (uses equality matching)
- `row` (object): Object containing the columns to update, where each key is a column name and value is the new value

**Example:**
```javascript
// Update a single record by ID
db.update('users', { id: 123 }, {
  name: 'John Doe',
  email: 'john@example.com'
});

// Update with multiple WHERE conditions (AND)
db.update('products', { category: 'electronics', active: true }, {
  discount: 0.1,
  updated_at: Date.now()
});
```

The generated SQL will look like: `UPDATE <tableName> SET column1 = ?, column2 = ? WHERE key1 = ? AND key2 = ?`

**Note:** For complex WHERE conditions (e.g., `>`, `<`, `LIKE`, `OR`), use `db.run()` directly with a custom SQL statement.

#### SqliteDatabase.upsert(tableName, where: Record<string,any>, row: Record<string, any>)

Convenience function that either does an `update` or `insert`.

First the function will try to run an `update` (with the same handling as `SqliteDatabase.update`).

If zero rows were changed by the `update`, then upsert() will next run an `insert` (with the
same handling as `SqliteDatabase.insert`);
