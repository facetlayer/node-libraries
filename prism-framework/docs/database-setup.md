---
name: database-setup
description: How to set up a local SQLite database for your backend application
---

# Database Setup

This guide covers setting up a local SQLite database for your Prism Framework backend application using the `@facetlayer/sqlite-wrapper` library.

## Directory Structure

Set up the database as a backend "service" with its own folder inside the `./src` directory:

```
src/
├── _main/
│   └── index.ts
├── user-database/
│   └── db.ts
└── other-services/
    └── ...
```

## Installation

Install the required packages:

```bash
pnpm add @facetlayer/sqlite-wrapper better-sqlite3
pnpm add -D @types/better-sqlite3
```

## Database Configuration

Create a database module at `src/user-database/db.ts`:

```typescript
import { DatabaseLoader, SqliteDatabase } from '@facetlayer/sqlite-wrapper';
import { toConsoleLog } from '@facetlayer/streams';
import BetterSqliteDatabase from 'better-sqlite3';
import Path from 'path';

let db: SqliteDatabase | null = null;

const schema = {
  name: 'MyAppDatabase',
  statements: [
    `create table users (
      id integer primary key autoincrement,
      email text not null unique,
      created_at integer not null default (strftime('%s', 'now'))
    )`,
    `create index idx_users_email on users(email)`,
  ]
}

export function getDatabase(): SqliteDatabase {
  const DATABASE_DIR = process.env.DATABASE_DIR;
  if (!DATABASE_DIR) {
    throw new Error('DATABASE_DIR is not set');
  }

  if (!db) {
    const loader = new DatabaseLoader({
      filename: Path.join(DATABASE_DIR, 'app.db'),
      loadDatabase: (filename) => new BetterSqliteDatabase(filename),
      migrationBehavior: 'safe-upgrades',
      schema,
      logs: toConsoleLog('[database]'),
    });

    db = loader.load();
  }
  return db;
}
```

## Environment Variable

The `DATABASE_DIR` environment variable must be set to specify where the database file will be stored.

For local development, create a `.env` file:

```
DATABASE_DIR=./data
```

Make sure the directory exists:

```bash
mkdir -p ./data
```

## Using the Database

Import and use the database in your services:

```typescript
import { getDatabase } from '../user-database/db';

export async function createUser(email: string) {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO users (email) VALUES (?)');
  const result = stmt.run(email);
  return result.lastInsertRowid;
}

export async function getUserByEmail(email: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}
```

## Schema Migrations

The `DatabaseLoader` handles schema migrations automatically with the `migrationBehavior` option:

- `'safe-upgrades'` - Automatically applies safe migrations (adding tables, columns, indexes)
- `'strict'` - Only creates schema on first run, no automatic migrations

For complex migrations, add new statements to the `statements` array. The loader will apply them in order.

## Multiple Databases

If your application needs multiple databases, create separate modules with different schemas and filenames:

```typescript
// src/user-database/db.ts
export function getUserDatabase(): SqliteDatabase { ... }

// src/project-database/db.ts
export function getProjectDatabase(): SqliteDatabase { ... }
```
