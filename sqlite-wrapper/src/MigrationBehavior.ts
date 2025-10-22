/**
 * Migration Behavior Options
 *
 * Controls the schema migration behavior that is performed (if any) when the database is loaded.
 *
 * 1. "strict" - Strict mode
 *    - Does not perform any automatic migrations
 *    - Throws an error on startup if the existing database schema doesn't match the expected schema
 *    - Any schema migrations must be done manually, in a separate step.
 *    - Recommended for production.
 *
 * 2. "safe-upgrades" - Safe upgrades mode
 *    - Performs only safe, non-destructive migrations automatically
 *    - "Safe" migrations includes: adding new tables, columns and indexes, as long as
 *      they don't already exist.
 *    - Ignores any leftover tables or columns that are in the database but not in the current schema.
 *    - Ignores any destructive migrations that would require a table rebuild.
 *    - Use this for development environments where you want automatic migrations but want to avoid data loss
 *    - Recommended for preprod enviroments.
 *
 * 3. "full-destructive-updates" - Full development mode
 *    - Performs all migrations to match the current schema, including destructive operations.
 *    - Drops leftover tables that are not in the current schema
 *    - Will perform ALTER TABLE operations as needed to match the current schema.
 *    - If a change can't be done with ALTER TABLE, then the library will perform a table rebuild.
 *      A "rebuild" means: creating a new table with the latest schema, migrating every row over, and
 *      dropping the old table.
 *    - Can result in data loss if any existing data doesn't fit the new schema.
 *    - Recommended for local development and automated testing.
 */
export type MigrationBehavior = 'strict' | 'safe-upgrades' | 'full-destructive-updates' | 'ignore';
