
# 1.4.0
 - Export the SQL parser helpers `parseSql` and `stripSqlComments`.
 - Add `getLeadingKeyword(sql)` and `isQueryStatement(sql)` for classifying a
   statement (e.g. telling read queries apart from writes) using the lexer
   instead of a fragile regex. Both are comment-aware.

# 1.3.2
 - `applySafeUpgrades` / `applyFullDestructiveUpdates`: add columns before
   creating indexes that may reference them (previously, an index added in
   the same migration as its column would fail with "no such column").
 - Safe migrations now accept `not null default <literal>` columns via
   `ALTER TABLE ADD COLUMN`. Previously any `not null` add was skipped.

# 1.3.0
 - Replace better-sqlite3 with Node.js built-in `node:sqlite` module
 - Remove `loadDatabase` option from `DatabaseSetupOptions` (database is now created internally)
 - Remove `BetterSqliteLoader` and `LoadDatabaseFn` exports
 - Add `disableSqliteExperimentalWarning()` to suppress the node:sqlite experimental warning
 - Replace `db.db.transaction()` in table rebuilds with manual BEGIN/COMMIT/ROLLBACK

# 1.2.3
 - Fix SQL parser failing on CREATE TABLE statements that contain SQL comments (-- or /* */)
 - Bump better-sqlite3 from 11.8.1 to 12.8.0

# 1.2.2
 - Changed `logs` option from a `Stream` instance to a `DatabaseLogs` callback object.

# 1.2.0
 - Adds a retry loop on schema migration, certain errors will trigger a retry.

# 1.1.0
 - Adding MigrationSetting
 - Change .update() call to take `where: Record<string,any>`

# 0.9.1

 - Bug fix when building SQL when the `where` object is empty.

# 0.9.0

 - Moved to new repo

# 0.3.2

 - Add SlowQueryWarning

# 0.3.1

 - Fix bugs in the SQL parsing logic for some expressions.

# 0.3.0

 - The `.logs` field in SetupOptions is now required.

# 0.2.0

 - Fix a bug where the library was failing on PRAGMA in the initial statements list.
 - Add support for an `onRunStatement` callback.

# 0.1.2

- Bug fixes related to NPM publishing.


# 0.1.0

Initial public release.
