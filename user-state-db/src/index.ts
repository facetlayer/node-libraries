import * as path from 'path'
import { getOrCreateStateDirectory, getStateDirectory } from '@facetlayer/user-state-dir'
import { DatabaseLoader, SqliteDatabase, DatabaseSchema } from '@facetlayer/sqlite-wrapper'
import { Stream } from '@facetlayer/streams'
import BetterSqlite3 from 'better-sqlite3'

export interface GetStateDatabaseOptions {
  /**
   * Application name - used for directory naming
   * Example: 'my-awesome-app' -> ~/.local/state/my-awesome-app/
   */
  appName: string

  /**
   * Database schema definition
   */
  schema: DatabaseSchema

  /**
   * Migration behavior for schema changes
   * - 'ignore': No migration checks
   * - 'safe-upgrades': Apply safe migrations (add columns, create tables) - default
   * - 'strict': Verify schema matches exactly
   * - 'full-destructive-updates': Apply all migrations including destructive ones
   */
  migrationBehavior?: 'ignore' | 'strict' | 'safe-upgrades' | 'full-destructive-updates'

  /**
   * Optional custom logs stream
   */
  logs?: Stream
}

/**
 * Set up and return a SQLite database in the user's state directory
 *
 * This function:
 * - Determines the appropriate directory following XDG standards
 * - Creates the directory if it doesn't exist
 * - Initializes a SQLite database at {directory}/db.sqlite
 * - Applies the provided schema
 * - Returns a ready-to-use database instance
 */
export function getStateDatabase(
  options: GetStateDatabaseOptions
): SqliteDatabase {
  const { appName, schema, migrationBehavior = 'safe-upgrades', logs = new Stream() } = options

  // Get or create the state directory for this app
  const stateDir = getOrCreateStateDirectory(appName)

  // Database path is always db.sqlite in the state directory
  const dbPath = path.join(stateDir, 'db.sqlite')

  // Create and initialize the database
  const loader = new DatabaseLoader({
    filename: dbPath,
    schema,
    logs,
    loadDatabase(filename) { return new BetterSqlite3(filename) },
    migrationBehavior,
  })

  const db = loader.load()
  return db
}

/**
 * Re-export directory functions from user-state-dir for convenience
 */
export { getStateDirectory, getOrCreateStateDirectory } from '@facetlayer/user-state-dir'

/**
 * Re-export types from sqlite-wrapper for convenience
 */
export type { DatabaseSchema, SqliteDatabase } from '@facetlayer/sqlite-wrapper'
