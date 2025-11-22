# SingletonAccessor

The `SingletonAccessor` class provides a simple interface for tables that should only contain a single row, like configuration or settings tables.

## Usage

```typescript
const config = db.singleton('app_config');
```

## Methods

### `get()`

Returns the single row from the table, or `undefined` if the table is empty.

```typescript
const settings = config.get();
// Returns: { theme: 'dark', language: 'en' } | undefined
```

### `set(item)`

Replaces the entire table contents with the given row. This:
1. Deletes all existing rows
2. Inserts the new row

```typescript
config.set({
    theme: 'light',
    language: 'fr',
    notifications_enabled: true
});
```

## Example

### Schema

```typescript
const schema: DatabaseSchema = {
    name: 'AppDatabase',
    statements: [
        `create table app_config(
            theme text default 'light',
            language text default 'en',
            notifications_enabled integer default 1
        )`
    ]
};
```

### Usage

```typescript
import { DatabaseLoader } from '@facetlayer/sqlite-wrapper';

const db = loader.load();
const config = db.singleton('app_config');

// Get current settings
let settings = config.get();

if (!settings) {
    // Initialize with defaults
    config.set({
        theme: 'light',
        language: 'en',
        notifications_enabled: 1
    });
    settings = config.get();
}

console.log(`Current theme: ${settings.theme}`);

// Update settings
config.set({
    ...settings,
    theme: 'dark'
});
```

## When to Use

Use `SingletonAccessor` when you have:

- Application configuration
- Global settings
- Single-instance metadata
- Version information

For tables with multiple rows, use the standard `get()`, `list()`, `insert()`, and `update()` methods on `SqliteDatabase`.
