# Getting Started

## Installation

```bash
pnpm add @facetlayer/userdata-db
```

The library includes `@facetlayer/sqlite-wrapper` and `better-sqlite3` as dependencies, so you don't need to install them separately.

## Basic Usage

### 1. Define Your Schema

Create a schema object that describes your database tables:

```typescript
import { DatabaseSchema } from '@facetlayer/userdata-db'

const schema: DatabaseSchema = {
  name: 'my-app-db',
  statements: [
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`,
    `CREATE INDEX idx_users_email ON users(email)`
  ]
}
```

### 2. Get the Database

```typescript
import { getUserdataDatabase } from '@facetlayer/userdata-db'

const db = getUserdataDatabase({
  appName: 'my-awesome-app',
  schema
})
```

This will:
1. Determine the appropriate directory (following XDG standards)
2. Create the directory if it doesn't exist
3. Initialize or open the SQLite database
4. Apply any necessary schema migrations
5. Return a ready-to-use database instance

### 3. Use the Database

The returned `db` is a `SqliteDatabase` instance from `@facetlayer/sqlite-wrapper`:

```typescript
// Insert data
db.insert('users', {
  name: 'Alice',
  email: 'alice@example.com'
})

// Query data
const user = db.get('SELECT * FROM users WHERE email = ?', ['alice@example.com'])

// List all users
const users = db.list('SELECT * FROM users')

// Count users
const count = db.count('from users')

// Check existence
const exists = db.exists('from users where email = ?', ['alice@example.com'])

// Update data
db.update('users', { id: 1 }, { name: 'Alice Smith' })

// Upsert (update or insert)
db.upsert('settings', { key: 'theme' }, { key: 'theme', value: 'dark' })
```

## Example: Settings Storage

A common use case is storing application settings:

```typescript
import { getUserdataDatabase } from '@facetlayer/userdata-db'

const db = getUserdataDatabase({
  appName: 'my-cli-tool',
  schema: {
    name: 'settings-db',
    statements: [
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`
    ],
    initialData: [
      `INSERT INTO settings (key, value) VALUES ('theme', 'dark')`,
      `INSERT INTO settings (key, value) VALUES ('language', 'en')`
    ]
  }
})

// Get a setting
function getSetting(key: string): string | undefined {
  const row = db.get('SELECT value FROM settings WHERE key = ?', [key])
  return row?.value
}

// Set a setting
function setSetting(key: string, value: string): void {
  db.upsert('settings', { key }, { key, value })
}

// Usage
const theme = getSetting('theme') // 'dark'
setSetting('theme', 'light')
```

## Example: CLI History

Another common use case is storing command history:

```typescript
import { getUserdataDatabase } from '@facetlayer/userdata-db'

const db = getUserdataDatabase({
  appName: 'my-cli',
  schema: {
    name: 'history-db',
    statements: [
      `CREATE TABLE history (
        id INTEGER PRIMARY KEY,
        command TEXT NOT NULL,
        timestamp INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE INDEX idx_history_timestamp ON history(timestamp DESC)`
    ]
  }
})

// Add to history
function addToHistory(command: string): void {
  db.insert('history', { command })
}

// Get recent history
function getRecentHistory(limit: number = 100): string[] {
  const rows = db.list(
    'SELECT command FROM history ORDER BY timestamp DESC LIMIT ?',
    [limit]
  )
  return rows.map(r => r.command)
}
```

## Next Steps

- Learn about [Directory Resolution](./directory-resolution.md) to understand where your database is stored
- See the full [API Reference](./api.md)
- Understand [Schema Migration](./migration.md) options
