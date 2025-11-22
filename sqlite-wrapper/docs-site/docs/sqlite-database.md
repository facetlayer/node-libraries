# SqliteDatabase

The `SqliteDatabase` class provides a wrapper around `better-sqlite3` with convenient methods for common database operations.

## Query Methods

### `get(sql, params?)`

Runs a SELECT query and returns the first matching row, or `undefined` if no rows match.

```typescript
const user = db.get('select * from users where id = ?', [1]);
// Returns: { id: 1, name: 'John', email: 'john@example.com' } | undefined
```

### `list(sql, params?)`

Runs a SELECT query and returns all matching rows as an array.

```typescript
const users = db.list('select * from users where active = ?', [true]);
// Returns: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
```

### `all(sql, params?)`

Alias for `list()`.

### `each(sql, params?)`

Returns an iterator for all matching rows. Useful for processing large result sets without loading everything into memory.

```typescript
for (const user of db.each('select * from users')) {
    console.log(user.name);
}
```

### `run(sql, params?)`

Executes a SQL statement (INSERT, UPDATE, DELETE, etc.) and returns the result.

```typescript
const result = db.run('update users set name = ? where id = ?', ['John Doe', 1]);
// Returns: { changes: 1, lastInsertRowid: 0 }
```

**Return type:**
```typescript
interface RunResult {
    changes: number;           // Number of rows affected
    lastInsertRowid: number | bigint;  // Last inserted row ID
}
```

## Convenience Methods

### `exists(sql, params?)`

Checks if any rows match the condition. The `sql` should start with `from <table> where ...`.

```typescript
const hasUsers = db.exists('from users where email = ?', ['john@example.com']);
// Returns: true | false
```

### `count(sql, params?)`

Counts matching rows. The `sql` should start with `from <table> where ...`.

```typescript
const userCount = db.count('from users where active = ?', [true]);
// Returns: 42
```

### `insert(tableName, row)`

Inserts a row into the specified table.

```typescript
db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    created_at: Date.now()
});
```

### `update(tableName, whereClause, row)`

Updates rows matching the where clause. The `whereClause` is an object where keys are column names.

```typescript
db.update('users', { id: 1 }, {
    name: 'John Smith',
    updated_at: Date.now()
});
```

### `upsert(tableName, whereClause, row)`

Attempts an update first; if no rows are affected, performs an insert.

```typescript
db.upsert('users', { email: 'john@example.com' }, {
    name: 'John Doe',
    email: 'john@example.com',
    updated_at: Date.now()
});
```

## Utility Methods

### `pragma(statement)`

Executes a SQLite PRAGMA statement.

```typescript
const journalMode = db.pragma('journal_mode');
```

### `close()`

Closes the database connection.

```typescript
db.close();
```

## Singleton Helpers

### `singleton(tableName)`

Creates a `SingletonAccessor` for tables that should only have one row.

```typescript
const config = db.singleton('app_config');
const settings = config.get();
config.set({ theme: 'dark', language: 'en' });
```

See [SingletonAccessor](./singleton-accessor.md) for more details.

### `incrementingId(tableName, options?)`

Creates a `SingletonIncrementingId` for generating sequential IDs.

```typescript
const invoiceIds = db.incrementingId('invoice_counter', { initialValue: 1000 });
const nextId = invoiceIds.take(); // Returns 1000, then 1001, etc.
```

See [SingletonIncrementingId](./singleton-incrementing-id.md) for more details.

## Schema Management

### `migrateToSchema(schema, options?)`

Applies migrations to match the given schema.

```typescript
db.migrateToSchema(schema, { includeDestructive: false });
```

### `performRebuild(schema, tableName)`

Rebuilds a table to match the schema. Used for destructive changes that can't be done with ALTER TABLE.

```typescript
db.performRebuild(schema, 'users');
```

### `setupInitialData(statement)`

Runs an INSERT statement only if the table is empty. Useful for seeding initial data.

```typescript
db.setupInitialData(`insert into config(key, value) values('version', '1.0')`);
```
