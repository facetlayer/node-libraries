# SQL Access

Goobernetes can run SQL queries against the SQLite databases of a deployed project. This is useful for quick operational tasks: inspecting production data, running one-off migrations, or checking cache contents — without needing to SSH into the server.

## How it works

1. You declare which SQLite files belong to a project by adding `database` entries to its `.goob` config file.
2. On deploy, the config (including the database list) is stored on the server alongside the deployment record.
3. From a client machine, you run `goob sql <config-file> <query>`. The client sends the query over the same JSON-RPC channel used for deploys. The server opens the database file(s) from the active deployment directory and executes the query.
4. Results come back over the same channel and are printed as a table.

The server always reads the database list from the *active* deployment's stored config, so the SQL command targets the same files the running application sees.

## Configuring databases

Add one `database` line per SQLite file to your `.goob` config. Paths are relative to the project's deployment directory on the server.

```
deploy-settings
  project-name=my-app
  dest-url=http://production-server:4800
  update-in-place

database data/app.sqlite
database data/cache.sqlite

include src
include package.json
```

You can list as many databases as you need. After updating the config, redeploy the project so the server picks up the new database list:

```
goob deploy deploy.goob
```

## Listing databases

To see which databases are registered for a project and what tables they contain:

```
goob list-databases deploy.goob
```

Example output:

```
Databases for project 'my-app':

  data/app.sqlite
  Tables: users, sessions, orders

  data/cache.sqlite
  Tables: cache
```

This is also a good sanity check that the `database` entries in your config resolve to real files on the server.

## Running a query

```
goob sql deploy.goob '<sql query>'
```

For a project with a single database, the query runs against that database directly:

```
$ goob sql deploy.goob 'SELECT count(*) as n FROM users'
n
--
42

(1 row)
```

For `SELECT` queries, results are printed as an aligned table with column headers and a row count footer. For `INSERT`, `UPDATE`, `DELETE`, and DDL statements, only the number of rows affected is printed.

Remember to use single quotes for SQL string literals (SQLite treats double-quoted identifiers as column names):

```
goob sql deploy.goob "INSERT INTO cache (key, value) VALUES ('foo', 'bar')"
```

## Multi-database routing

When a project has more than one database configured, Goobernetes needs to figure out which one to route each query to. It does this by parsing the SQL, extracting the referenced table names, and picking the database that contains those tables.

Routing is based on the table name(s) found after these keywords: `FROM`, `JOIN`, `INTO`, `UPDATE`, `TABLE`. `CREATE TABLE IF NOT EXISTS foo` and `DROP TABLE IF EXISTS foo` are both handled.

```
$ goob sql deploy.goob 'SELECT * FROM users WHERE id = 1'
# → routed to data/app.sqlite (only database containing a 'users' table)

$ goob sql deploy.goob 'SELECT count(*) FROM cache'
# → routed to data/cache.sqlite
```

### When routing fails

If the parser can't determine a table name (for example, `SELECT 1 + 1`), or the referenced table doesn't exist in any configured database, or the table name appears in *multiple* databases, the command fails with an error that lists every configured database and its tables:

```
Ambiguous query: tables [users] found in multiple databases: data/app.sqlite, data/cache.sqlite
Use --database to specify which one.
Available databases:
  data/app.sqlite (tables: users, sessions, orders)
  data/cache.sqlite (tables: users, cache)
```

## Overriding the target database

Use `--database <path>` to bypass auto-routing and pick a specific database:

```
goob sql deploy.goob "SELECT name FROM sqlite_master WHERE type='table'" --database data/app.sqlite
```

This is useful when:

- The query references `sqlite_master` or another built-in that isn't tied to a specific user table
- You want to run the same query against multiple databases explicitly
- Auto-routing picks the wrong database (e.g. when table names collide)

The `--database` path must match one that's listed in the `.goob` config and must resolve to a file inside the deployment directory (path-traversal is blocked).

## Authentication

The SQL command uses the same `GOOBERNETES_API_KEY` environment variable and the same JSON-RPC endpoint as `goob deploy`. If you've already set up deploys for a project, SQL access works with no additional configuration.

## Caveats

- Queries run synchronously on the server and block other RPCs for the duration. Avoid long-running queries.
- Writes are committed immediately — there is no transaction wrapper around the command. Be careful with `UPDATE` and `DELETE` against production data. Use a `SELECT` first to verify the row set.
- The server opens databases with `better-sqlite3` in read-write mode (except for `list-databases`, which opens read-only). If your application holds a write lock, the query may fail.
- Parameterized queries aren't supported from the CLI — inline your values and watch your quoting. A `?`-parameter API may be added later.
- Table-name parsing is syntactic, not a full SQL parser. Exotic constructs (CTEs that alias tables, subqueries with no top-level `FROM`, etc.) may confuse auto-routing. Use `--database` as an escape hatch.
