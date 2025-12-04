import { DatabaseSchema, MigrationType } from "./types.ts";
import { TargetDatabase } from "./TargetDatabase.ts";
import { findDatabaseDrift } from "./findDatabaseDrift.ts";
import { prepareSafeMigration } from "./migration-safe.ts";
import { prepareDestructiveMigration } from "./migration-destructive.ts";

/**
 * Check an Error value decide whether we should retry the migration.
 */
export function shouldRetryOnError(err: Error): boolean {
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
export async function applyMigration(
  db: TargetDatabase,
  schema: DatabaseSchema,
  migrationType: MigrationType = "safe-updates",
): Promise<void> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get all drifts between current database and target schema
      const dbDrift = await findDatabaseDrift(db, schema);

      // Generate migration statements based on whether destructive updates are allowed
      const result = migrationType === "destructive-updates"
        ? prepareDestructiveMigration(dbDrift, schema)
        : prepareSafeMigration(dbDrift, schema);

      // Log warnings
      for (const warning of result.warnings) {
        db.warn(warning);
      }

      // Execute all statements
      for (const sql of result.statements) {
        await db.run(sql);
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
}
