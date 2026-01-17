# @facetlayer/user-state-db

Helper library to set up a SQLite database in the user's state directory following XDG Base Directory standards. Makes it easy to create persistent local databases for your applications.

This library combines `@facetlayer/user-state-dir` for directory resolution with `@facetlayer/sqlite-wrapper` for database management.

## Install

```
pnpm add @facetlayer/user-state-db
# or
npm i @facetlayer/user-state-db
```

## Quick Start

Set up a database for your application:

```ts
import { getStateDatabase } from '@facetlayer/user-state-db'

// Define your schema
const schema = {
  name: 'my-app-db',
  statements: [
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE
    )`,
    `CREATE INDEX idx_users_email ON users(email)`
  ]
}

// Get a ready-to-use database instance
const db = getStateDatabase({
  appName: 'my-awesome-app',
  schema
})

// Use the database
db.insert('users', { name: 'Alice', email: 'alice@example.com' })
const user = db.get('SELECT * FROM users WHERE email = ?', 'alice@example.com')
```

## Database Location

The database follows XDG Base Directory standards:

1. **Custom Directory**: Set `{APPNAME}_STATE_DIR` environment variable (e.g., `MY_APP_STATE_DIR`)
2. **XDG Standard**: Uses `$XDG_STATE_HOME/{appName}/db.sqlite` if set
3. **Default**: Falls back to `~/.local/state/{appName}/db.sqlite`

```bash
# Use a custom directory
export MY_APP_STATE_DIR=/tmp/my-app-state
node my-app.js  # Database: /tmp/my-app-state/db.sqlite

# Use XDG standard with custom base
export XDG_STATE_HOME=/custom/state
node my-app.js  # Database: /custom/state/my-awesome-app/db.sqlite

# Use default location
node my-app.js  # Database: ~/.local/state/my-awesome-app/db.sqlite
```

## API

### `getStateDatabase(options)`

Creates and initializes a SQLite database in the user's state directory.

**Options:**
- `appName` (string, required): Your application name (used for directory naming)
- `schema` (DatabaseSchema, required): Database schema definition
  - `name`: Schema name
  - `statements`: Array of CREATE TABLE and CREATE INDEX statements
  - `initialData` (optional): Array of INSERT statements to run on first setup
- `migrationBehavior` (optional): How to handle schema changes
  - `'ignore'`: No migration checks
  - `'safe-upgrades'`: Apply safe migrations (add columns, create tables) - default
  - `'strict'`: Verify schema matches exactly
  - `'full-destructive-updates'`: Apply all migrations including destructive ones
- `logs` (optional): Custom Stream for logging

**Returns:** `SqliteDatabase` instance from `@facetlayer/sqlite-wrapper`

### `getStateDirectory(appName)`

Re-exported from `@facetlayer/user-state-dir`. Returns the path to the state directory (may not exist yet).

### `getOrCreateStateDirectory(appName)`

Re-exported from `@facetlayer/user-state-dir`. Returns the path to the state directory, creating it if needed.

## Features

- **XDG Standards Compliant**: Respects user preferences via environment variables
- **Automatic Setup**: Creates directory and initializes database automatically
- **Schema Management**: Built-in migration support via `@facetlayer/sqlite-wrapper`
- **Type Safe**: Full TypeScript support
- **Simple API**: Minimal configuration needed

## Example with Initial Data

```ts
const schema = {
  name: 'config-db',
  statements: [
    `CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  ],
  initialData: [
    `INSERT INTO settings (key, value) VALUES ('version', '1.0.0')`,
    `INSERT INTO settings (key, value) VALUES ('theme', 'dark')`
  ]
}

const db = getStateDatabase({
  appName: 'my-app',
  schema,
  migrationBehavior: 'safe-upgrades'
})
```

## Suggestions for Testing

If you're writing tests for an application that uses `user-state-db`, then you can
take advantage of the environment variables to override the storage directory.

Typical approach:

1. Create a directory `./test/temp` at the start of the test suite.
2. Delete the contents at the start of the test.
3. Set `{APPNAME}_STATE_DIR` or `XDG_STATE_HOME` to your `./test/temp` directory.
4. Run the application code in tests, and check the files that it saves to `./test/temp`.

## Development

Scripts:

```
pnpm build   # compile TypeScript to dist/
pnpm test    # run unit tests (vitest)
```

## Related Libraries

- `@facetlayer/user-state-dir`: Directory resolution following XDG standards
- `@facetlayer/sqlite-wrapper`: The underlying database wrapper
- `@facetlayer/streams`: Stream utilities used for logging
