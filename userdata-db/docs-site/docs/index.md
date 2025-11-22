# userdata-db

Helper library to set up a SQLite database in the user's home directory following XDG Base Directory standards. Makes it easy to create persistent local databases for your applications.

## Features

- **XDG Standards Compliant**: Respects user preferences via environment variables
- **Automatic Setup**: Creates directory and initializes database automatically
- **Schema Management**: Built-in migration support via `@facetlayer/sqlite-wrapper`
- **Type Safe**: Full TypeScript support
- **Simple API**: Minimal configuration needed

## Installation

```bash
npm install @facetlayer/userdata-db
```

Or using other package managers:

```bash
# pnpm
pnpm add @facetlayer/userdata-db

# yarn
yarn add @facetlayer/userdata-db
```

## Quick Start

```typescript
import { getUserdataDatabase } from '@facetlayer/userdata-db'

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
const db = getUserdataDatabase({
  appName: 'my-awesome-app',
  schema
})

// Use the database
db.insert('users', { name: 'Alice', email: 'alice@example.com' })
const user = db.get('SELECT * FROM users WHERE email = ?', 'alice@example.com')
```

## Database Location

The database follows XDG Base Directory standards:

| Priority | Source | Example Path |
|----------|--------|--------------|
| 1 | `{APPNAME}_STATE_DIR` env var | `/custom/path/db.sqlite` |
| 2 | `$XDG_STATE_HOME/{appName}` | `/custom/state/my-app/db.sqlite` |
| 3 | Default | `~/.local/state/my-app/db.sqlite` |

## Next Steps

- **[Getting Started](./getting-started.md)** - Complete setup and usage guide
- **[API Reference](./api.md)** - Full API documentation
- **[Directory Resolution](./directory-resolution.md)** - How database paths are determined
- **[Schema Migration](./migration.md)** - Managing schema changes

## Related Libraries

- [`@facetlayer/sqlite-wrapper`](https://facetlayer.github.io/sqlite-wrapper) - The underlying database wrapper
