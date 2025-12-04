import { DatabaseSchema, DatabaseDrift } from "./types.ts";
import { TargetDatabase } from "./TargetDatabase.ts";
import { findDatabaseDrift } from "./findDatabaseDrift.ts";
import { buildSchemaMap, PreparedMigration } from "./migration-safe.ts";

export const DESTRUCTIVE_DRIFT_TYPES = new Set([
  "need_to_delete_column",
  "need_to_modify_column",
  "need_to_rebuild_table",
  "need_to_delete_index",
  "extra_table",
]);

/**
 * Generates SQL statements for all drifts across the entire database, including destructive operations.
 * This includes:
 * - Creating new tables
 * - Adding columns (including NOT NULL)
 * - Creating indexes
 * - Dropping extra tables
 *
 * Note: Table rebuilds and column drops are not supported and will generate warnings.
 */
export function prepareDestructiveMigration(
  dbDrift: DatabaseDrift,
  schema: DatabaseSchema,
): PreparedMigration {
  const schemaMap = buildSchemaMap(schema);
  const statements: string[] = [];
  const warnings: string[] = [];

  for (const [tableName, tableDrift] of dbDrift.tables.entries()) {
    // Check if this table needs a rebuild - if so, skip individual drifts
    const needsRebuild = tableDrift.drifts.some((d) => d.type === "need_to_rebuild_table");

    if (needsRebuild) {
      warnings.push(`Table rebuild needed for ${tableName} - not supported`);
      continue;
    }

    for (const drift of tableDrift.drifts) {
      switch (drift.type) {
        case "need_to_create_table": {
          const createStatement = schemaMap.get(`table:${tableName}`);
          if (createStatement) {
            statements.push(createStatement);
          }
          break;
        }

        case "need_to_create_index": {
          const createStatement = schemaMap.get(`index:${drift.indexName}`);
          if (createStatement) {
            statements.push(createStatement);
          }
          break;
        }

        case "need_to_add_column": {
          const sql = `ALTER TABLE ${tableName} ADD COLUMN ${drift.columnName} ${drift.newDefinition}`;
          statements.push(sql);
          break;
        }

        case "extra_table": {
          statements.push(`DROP TABLE ${tableName}`);
          break;
        }

        case "need_to_delete_column": {
          // SQLite doesn't support DROP COLUMN directly - would need rebuild
          warnings.push(
            `Cannot drop column ${tableName}.${drift.columnName} without table rebuild`,
          );
          break;
        }
      }
    }
  }

  return { statements, warnings };
}

/**
 * Checks if the database has any tables or structures that are not part of the schema.
 * Returns warnings for any extra tables or indexes found.
 */
export async function runDatabaseSloppynessCheck(
  db: TargetDatabase,
  schema: DatabaseSchema,
): Promise<string[]> {
  const drift = await findDatabaseDrift(db, schema);
  return drift.warnings.map((warning) => `${warning} (schemaName=${schema.name})`);
}
