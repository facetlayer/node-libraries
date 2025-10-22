/**
 * DATABASE MIGRATION BEHAVIOR OPTIONS
 *
 * The DatabaseLoader supports three different migration behaviors that control how schema
 * changes are applied to existing databases. Choose the appropriate behavior based on your
 * deployment environment:
 *
 * 1. "strict" - Production mode
 *    - Does not perform any automatic migrations
 *    - Throws an error on startup if the existing database schema doesn't match the expected schema
 *    - Use this in production environments where schema changes should be carefully controlled
 *    - Requires manual migration scripts to update database schemas
 *
 * 2. "safe-upgrades" - Safe development mode
 *    - Performs only safe, non-destructive migrations automatically
 *    - Adds new tables and columns as needed
 *    - Ignores leftover tables that are not in the current schema
 *    - Does not rebuild tables even if column types or constraints have changed
 *    - Use this for development environments where you want automatic migrations but want to avoid data loss
 *
 * 3. "full-destructive-updates" - Full development mode
 *    - Performs all migrations including destructive operations
 *    - Drops leftover tables that are not in the current schema
 *    - Rebuilds tables when ALTER TABLE operations aren't sufficient (e.g., changing column types)
 *    - Can result in data loss when tables are rebuilt or dropped
 *    - Use this only in local development or test environments where data loss is acceptable
 *
 * Set the migration behavior using the DATABASE_MIGRATION_BEHAVIOR environment variable.
 */
export type MigrationBehavior = 'strict' | 'safe-upgrades' | 'full-destructive-updates' | 'ignore';
