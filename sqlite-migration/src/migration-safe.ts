import { parseSql } from "./simple-sql-parser.ts";
import { DatabaseSchema, Drift, DatabaseDrift } from "./types.ts";

export interface PreparedMigration {
  statements: string[];
  warnings: string[];
}

/**
 * Helper function to build a map of schema statements for quick lookup
 */
export function buildSchemaMap(schema: DatabaseSchema): Map<string, string> {
  const schemaMap = new Map<string, string>();
  for (const statementText of schema.statements) {
    const statement = parseSql(statementText);
    if (statement.t === "create_table") {
      schemaMap.set(`table:${statement.table_name}`, statementText);
    } else if (statement.t === "create_index") {
      schemaMap.set(`index:${statement.index_name}`, statementText);
    }
  }
  return schemaMap;
}

/**
 * Generates SQL statements for safe, non-destructive drifts across the entire database.
 * Safe operations include:
 * - Creating new tables
 * - Adding nullable columns
 * - Creating new indexes
 *
 * Returns warnings for destructive drifts that are skipped.
 */
export function prepareSafeMigration(
  dbDrift: DatabaseDrift,
  schema: DatabaseSchema,
): PreparedMigration {
  const schemaMap = buildSchemaMap(schema);
  const statements: string[] = [];
  const warnings: string[] = [];

  for (const [tableName, tableDrift] of dbDrift.tables.entries()) {
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

        default:
          // All other drifts are destructive
          warnings.push(`Skipping destructive migration: ${drift.type}`);
      }
    }
  }

  return { statements, warnings };
}
