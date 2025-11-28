# SqliteDatabase

The `SqliteDatabase` class provides a wrapper around `better-sqlite3` with convenient methods for common database operations.

## Calling style

All methods accept an optional `params` value. Just like in [better-sqlite3](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md), this value can be an array (for positional `?` parameters), or it can be an object (for named `?xxx` parameters).

## Query Methods

These methods correspond directly to Statement methods in better-sqlite3.

### `get(sql, params?)`

Runs a SELECT query and returns the first matching row, or `undefined` if no rows match.

Uses [Statement.get](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#getbindparameters---row)

```typescript
const user = db.get('select * from users where id = ?', [1]);
// Returns: { id: 1, name: 'John', email: 'john@example.com' } | undefined
```

### `list(sql, params?)`

Runs a SELECT query and returns all matching rows as an array.

Uses [Statement.all](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#allbindparameters---array-of-rows)

```typescript
const users = db.list('select * from users where active = ?', [true]);
// Returns: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
```

### `all(sql, params?)`

Alias for `list()`.

### `each(sql, params?)`

Similar to `all()` but returns an iterator instead of a complete list.
Useful for processing large result sets without loading everything into memory.

Uses [Statement.iterate](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#iteratebindparameters---iterator)

```typescript
for (const user of db.each('select * from users')) {
    console.log(user.name);
}
```

### `run(sql, params?)`

Executes a SQL statement (INSERT, UPDATE, DELETE, etc.) and returns the result.

Uses [Statement.run](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#runbindparameters---object)

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

### `pragma(statement)`

Executes a SQLite PRAGMA statement.

```typescript
const journalMode = db.pragma('journal_mode');
```

## Helper Methods

These methods use more complex SQL query building logic, to help with common use cases.

### `exists(condition: string, params?)`

Checks if any rows match the condition. The incoming `condition` parameter should look like: `from <table> where ...`. 

This will build a query that looks like: `select exists(select 1 {condition})`

```typescript
const hasUsers = db.exists('from users where email = ?', ['john@example.com']);
// Returns: true | false
```

### `count(condition: string, params?)`

Counts matching rows. The `condition` should start with `from <table> where ...`.

This will build a query that looks like: `select count(*) {condition}`

```typescript
const userCount = db.count('from users where active = ?', [true]);
// Returns: 42
```

### `insert(tableName: string, row: Record<string, any>)`

Inserts a row into the specified table.

This will build a query that looks like `insert into {tableName} ({columns}) values ({parameters})`. Each name & value of the incoming object will be converted into the columns & parameters section. The names should exactly match table columns.

```typescript
db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
});
```

#### How 'row' objects are used

Each field in a 'row' object corresponds to one column.

This call:
```typescript
db.insert('users', { name: 'John Doe', });
```

Is the same as this:

```typescript
db.run('insert into users (name) values (?)', ["John Doe"]);
```

#### Parameter Binding

For object values, the builder will use `?` parameters when passing those values.

But, the object field names are directly used as column names. Make sure that your objects use fixed strings for the field names.

Example of what NOT to do:

```typescript
const userObject = { name: 'John Doe' };
const targetField = ...;
// Bad pattern: The dynamic string value for 'targetField' will be directly injected into SQL:
userObject[targetField] = targetValue;
db.insert('users', userObject);
```

### `update(tableName: string, whereClause: Record<string, any>, row: Record<string,any>)`

Updates rows matching the where clause.

This will build a query that looks like: `update {tableName} set {columns} where {conditions}`.

The `whereClause` object will be converted into `{name} = {value}` conditions. The `row` object will be converted into the `SET name = value` section.

See above section for "How 'row' objects are used"

```typescript
db.update('users', { id: 1 }, {
    name: 'John Smith',
    updated_at: Date.now()
});
```

### `upsert(tableName: string, whereClause: Record<string, any>, row: Record<string, any>)`

Does a two-step operation:

1. First, try to do `.update()` (using the .update helper above)
2. If the database reports that zero rows were affected, then perform an `.insert()`.

See the above section for "How 'row' objects are used"

```typescript
db.upsert('users', { email: 'john@example.com' }, {
    name: 'John Doe',
    email: 'john@example.com',
    updated_at: Date.now()
});
```

## Utility Methods

### `close()`

Closes the database connection.

```typescript
db.close();
```

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
