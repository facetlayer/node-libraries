
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { DatabaseLoader, loadBetterSqlite, SqliteDatabase, DatabaseSchema } from '@facetlayer/sqlite-wrapper'
import { Stream } from '@facetlayer/streams'
import BetterSqlite3 from 'better-sqlite3'

export interface GetUserdataDatabaseOptions {
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
 * Get the state directory for an application following XDG standards
 *
 * Priority order:
 * 1. {APPNAME}_STATE_DIR environment variable
 * 2. $XDG_STATE_HOME/{appName}
 * 3. ~/.local/state/{appName} (XDG default)
 */
export function getStateDirectory(appName: string): string {
  // Convert appName to uppercase and replace hyphens with underscores for env var
  const envVarName = appName.toUpperCase().replace(/-/g, '_') + '_STATE_DIR'

  // First: Use APP_STATE_DIR if set
  if (process.env[envVarName]) {
    return process.env[envVarName]!
  }

  // Next: Use XDG_STATE_HOME if set
  if (process.env.XDG_STATE_HOME) {
    return path.join(process.env.XDG_STATE_HOME, appName)
  }

  // Default: Use the XDG style default: ~/.local/state/{appName}/
  return path.join(os.homedir(), '.local', 'state', appName)
}

/**
 * Get or create the state directory for an application
 *
 * This function calls getStateDirectory() and ensures the directory exists,
 * creating it recursively if needed.
 */
export function getOrCreateStateDirectory(appName: string): string {
  const stateDir = getStateDirectory(appName)

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true })
  }

  return stateDir
}

/**
 * Set up and return a SQLite database in the user's home directory
 *
 * This function:
 * - Determines the appropriate directory following XDG standards
 * - Creates the directory if it doesn't exist
 * - Initializes a SQLite database at {directory}/db.sqlite
 * - Applies the provided schema
 * - Returns a ready-to-use database instance
 */
export async function getUserdataDatabase(
  options: GetUserdataDatabaseOptions
): Promise<SqliteDatabase> {
  const { appName, schema, migrationBehavior = 'safe-upgrades', logs = new Stream() } = options

  // Get or create the state directory for this app
  const stateDir = getOrCreateStateDirectory(appName)

  // Database path is always db.sqlite in the state directory
  const dbPath = path.join(stateDir, 'db.sqlite')

  // Load better-sqlite3
  // Create and initialize the database
  const loader = new DatabaseLoader({
    filename: dbPath,
    schema,
    logs,
    loadDatabase(filename) { return new BetterSqlite3(filename) },
    migrationBehavior,
  })

  const db = loader.load()
  return db;
}

/**
 * Re-export types from sqlite-wrapper for convenience
 */
export type { DatabaseSchema, SqliteDatabase } from '@facetlayer/sqlite-wrapper'
