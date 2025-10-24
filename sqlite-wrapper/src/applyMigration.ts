import { SqliteDatabase } from "./SqliteDatabase";
import { DatabaseSchema } from "./DatabaseSchema";
import { MigrationOptions } from "./migration";
import { findDatabaseDrift } from "./findDatabaseDrift";
import { applySafeUpgrades, applyFullDestructiveUpdates } from "./migration";

/**
 * Determines if an error should trigger a retry of the migration.
 * Returns true for errors that indicate a concurrent migration operation.
 *
 * @param err - The error to check
 * @returns true if the error is retryable, false otherwise
 */
export function shouldRetryOnError(err: any): boolean {
  if (!err) return false;

  const errorMessage = err.message || String(err);
  const errorMessageLower = errorMessage.toLowerCase();

  // Check for common SQLite errors that indicate concurrent updates
  return (
    errorMessageLower.includes("table") && errorMessageLower.includes("already exists") ||
    errorMessageLower.includes("index") && errorMessageLower.includes("already exists") ||
    errorMessageLower.includes("duplicate column name")
  );
}

/**
 * Applies migration from the current database state to the target schema.
 * This includes analyzing drifts and applying either safe or destructive updates.
 *
 * Handles concurrent migration attempts by retrying on race condition errors
 * (e.g., "table already exists" when multiple processes try to create the same table).
 *
 * @param db - The database to migrate
 * @param schema - The target schema
 * @param options - Migration options (e.g., includeDestructive)
 */
export function applyMigration(
  db: SqliteDatabase,
  schema: DatabaseSchema,
  options: MigrationOptions = {},
): void {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get all drifts between current database and target schema
      const dbDrift = findDatabaseDrift(db, schema);

      // Apply migrations based on whether destructive updates are allowed
      if (options.includeDestructive) {
        applyFullDestructiveUpdates(db, dbDrift, schema);
      } else {
        applySafeUpgrades(db, dbDrift, schema);
      }


      // Success - exit the retry loop
      break;
    } catch (err) {

      // Check if this is a retryable error
      if (shouldRetryOnError(err)) {
        // Log the retry attempt
        db.info(`Migration attempt ${attempt + 1} failed with retryable error, retrying...`);

        // If this wasn't the last attempt, continue to retry
        if (attempt < maxRetries - 1) {
          continue;
        }
      }

      // Either not retryable, or we've exhausted retries - throw the error
      throw err;
    }
  }

  // Successfully applied schema migrations.

  // Set up any initial data
  for (const statement of schema.initialData || []) {
    db.setupInitialData(statement);
  }

}
