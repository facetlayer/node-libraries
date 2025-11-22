# Database Schema

The `DatabaseSchema` interface defines the structure of your database.

## Interface

```typescript
interface DatabaseSchema {
    name: string;
    statements: string[];
    initialData?: string[];
}
```

## Properties

### `name`

A unique identifier for this database schema. Used for logging and debugging.

```typescript
const schema: DatabaseSchema = {
    name: 'MyAppDatabase',
    // ...
};
```

### `statements`

An array of SQL statements that define the database structure. Supports:

- `CREATE TABLE` statements
- `CREATE INDEX` statements

```typescript
const schema: DatabaseSchema = {
    name: 'MyAppDatabase',
    statements: [
        `create table users(
            id integer primary key,
            name text not null,
            email text unique,
            created_at integer default (unixepoch())
        )`,
        `create table posts(
            id integer primary key,
            user_id integer not null,
            title text not null,
            content text,
            published integer default 0,
            foreign key (user_id) references users(id)
        )`,
        `create index idx_posts_user on posts(user_id)`,
        `create index idx_posts_published on posts(published)`,
    ]
};
```

### `initialData`

Optional array of INSERT statements to seed the database with initial data. These statements are only executed if the target table is empty.

```typescript
const schema: DatabaseSchema = {
    name: 'MyAppDatabase',
    statements: [
        `create table config(key text primary key, value text)`,
        `create table roles(id integer primary key, name text unique)`,
    ],
    initialData: [
        `insert into config(key, value) values('app_version', '1.0.0')`,
        `insert into roles(name) values('admin')`,
        `insert into roles(name) values('user')`,
        `insert into roles(name) values('guest')`,
    ]
};
```

## Complete Example

```typescript
import { DatabaseSchema } from '@facetlayer/sqlite-wrapper';

export const appSchema: DatabaseSchema = {
    name: 'BlogDatabase',
    statements: [
        // Users table
        `create table users(
            id integer primary key,
            username text unique not null,
            email text unique not null,
            password_hash text not null,
            created_at integer default (unixepoch()),
            last_login integer
        )`,

        // Posts table
        `create table posts(
            id integer primary key,
            author_id integer not null,
            title text not null,
            slug text unique not null,
            content text,
            published integer default 0,
            created_at integer default (unixepoch()),
            updated_at integer,
            foreign key (author_id) references users(id)
        )`,

        // Tags table
        `create table tags(
            id integer primary key,
            name text unique not null
        )`,

        // Post-Tags junction table
        `create table post_tags(
            post_id integer not null,
            tag_id integer not null,
            primary key (post_id, tag_id),
            foreign key (post_id) references posts(id),
            foreign key (tag_id) references tags(id)
        )`,

        // Indexes for performance
        `create index idx_posts_author on posts(author_id)`,
        `create index idx_posts_slug on posts(slug)`,
        `create index idx_posts_published on posts(published)`,
    ],
    initialData: [
        `insert into tags(name) values('javascript')`,
        `insert into tags(name) values('typescript')`,
        `insert into tags(name) values('sqlite')`,
    ]
};
```

## Schema Evolution

When you modify your schema:

1. **Adding tables/columns** - Works with `safe-upgrades` mode
2. **Removing tables/columns** - Requires `full-destructive-updates` mode
3. **Modifying columns** - May require table rebuild in `full-destructive-updates` mode

See [Migration Behavior](./migration-behavior.md) for details on how different changes are handled.
