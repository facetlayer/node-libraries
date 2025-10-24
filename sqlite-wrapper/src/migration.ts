import { CreateTableStatement, CreateIndexStatement, parseSql } from "./parser";
import { SqliteDatabase } from "./SqliteDatabase";
import { DatabaseSchema } from "./DatabaseSchema";
import { performTableRebuild } from "./rebuildTable";
import { findTableDrift } from "./findTableDrift";
import { findDatabaseDrift } from "./findDatabaseDrift";

// =============================================================================
// Drift Types - Represent differences between database and schema
// =============================================================================

export type DriftType =
  | "need_to_create_table"
  | "need_to_add_column"
  | "need_to_delete_column"
  | "need_to_modify_column"
  | "need_to_rebuild_table"
  | "need_to_create_index"
  | "need_to_delete_index"
  | "extra_table";

export interface Drift {
  type: DriftType;
  tableName?: string;
  columnName?: string;
  indexName?: string;
  oldDefinition?: string;
  newDefinition?: string;
  warning?: string;
}

/**
 * Determines if a drift is destructive (may cause data loss or schema changes)
 */
export function isDriftDestructive(drift: Drift): boolean {
  return [
    "need_to_delete_column",
    "need_to_modify_column",
    "need_to_rebuild_table",
    "need_to_delete_index",
    "extra_table",
  ].includes(drift.type);
}

/**
 * Represents all drifts for a single table
 */
export interface TableDrift {
  drifts: Drift[];
}

/**
 * Represents all drifts across the entire database
 */
export interface DatabaseDrift {
  tables: Map<string, TableDrift>;
  warnings: string[];
}

export interface MigrationOptions {
  includeDestructive?: boolean;
}

function parseCreateTable(
  input: CreateTableStatement | string,
): CreateTableStatement {
  if (typeof input === "string") {
    const parsed = parseSql(input);
    if (parsed.t !== "create_table")
      throw new Error("expected a 'create table' statement");

    return parsed;
  }

  return input;
}

// =============================================================================
// Phase 1: Drift Detection
// =============================================================================

/**
 * Compares two table schemas and returns the drifts needed to migrate from
 * the current schema to the target schema.
 *
 * @param currentTableSql - The current CREATE TABLE statement (from database)
 * @param targetTableSql - The target CREATE TABLE statement (from schema)
 * @returns Array of Drift objects describing the differences
 */
export function getTableDrift(
  currentTableSql: string,
  targetTableSql: string,
): Drift[] {
  const currentTable = parseCreateTable(currentTableSql);
  const targetTable = parseCreateTable(targetTableSql);
  return findTableDrift(currentTable, targetTable);
}

/**
 * Analyzes the entire database and schema to find all drifts.
 * Returns both the drifts and any warnings about unsupported changes.
 *
 * @param db - The database to analyze
 * @param schema - The target schema
 * @returns DatabaseDrift with all drifts and warnings
 * @deprecated Use findDatabaseDrift instead
 */
export function getDatabaseDrift(
  db: SqliteDatabase,
  schema: DatabaseSchema,
): DatabaseDrift {
  return findDatabaseDrift(db, schema);
}

/**
 * Helper function to build a map of schema statements for quick lookup
 */
function buildSchemaMap(schema: DatabaseSchema): Map<string, string> {
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
 * Applies safe, non-destructive drifts for a single table.
 * Safe operations include:
 * - Creating the table
 * - Adding nullable columns
 *
 * @param db - The database to update
 * @param tableName - The table name
 * @param drifts - The drifts for this table
 * @param schemaMap - Mapping of schema statements
 */
function applySafeUpgradesToTable(
  db: SqliteDatabase,
  tableName: string,
  drifts: Drift[],
  schemaMap: Map<string, string>,
): void {
  for (const drift of drifts) {
    if (drift.type === "need_to_create_table") {
      const createStatement = schemaMap.get(`table:${tableName}`);
      if (createStatement) {
        db.info(`Creating table: ${tableName}`);
        db.run(createStatement);
      }
    } else if (drift.type === "need_to_add_column") {
      // Check if the new column has NOT NULL constraint
      const hasNotNull = drift.newDefinition?.toLowerCase().includes("not null");
      if (!hasNotNull) {
        const columnDef = drift.newDefinition;
        const sql = `alter table ${tableName} add column ${drift.columnName} ${columnDef};`;
        db.info(`Adding column: ${tableName}.${drift.columnName}`);
        db.run(sql);
      } else {
        db.warn(
          `Skipping safe migration of adding 'not null' column (requires table rebuild): ${tableName}.${drift.columnName}`,
        );
      }
    } else {
      // All other drifts are destructive
      db.warn(`Skipping destructive migration: ${drift.type}`);
    }
  }
}

/**
 * Applies only safe, non-destructive drifts across the entire database.
 * Safe operations include:
 * - Creating new tables
 * - Adding nullable columns
 * - Creating new indexes
 *
 * Logs warnings for destructive drifts that are skipped.
 *
 * @param db - The database to update
 * @param dbDrift - The database drift object
 * @param schema - The schema containing full CREATE statements
 */
export function applySafeUpgrades(
  db: SqliteDatabase,
  dbDrift: DatabaseDrift,
  schema: DatabaseSchema,
): void {
  const schemaMap = buildSchemaMap(schema);

  // Apply safe upgrades for each table
  for (const [tableName, tableDrift] of dbDrift.tables.entries()) {
    if (tableName === "__schema__") {
      // Handle schema-level drifts (indexes, extra tables)
      for (const drift of tableDrift.drifts) {
        if (drift.type === "need_to_create_index") {
          const createStatement = schemaMap.get(`index:${drift.indexName}`);
          if (createStatement) {
            db.info(`Creating index: ${drift.indexName}`);
            db.run(createStatement);
          }
        } else {
          // Skip destructive drifts like extra tables
          db.warn(`Skipping destructive migration: ${drift.type}`);
        }
      }
    } else {
      // Handle table-level drifts
      applySafeUpgradesToTable(db, tableName, tableDrift.drifts, schemaMap);
    }
  }
}

/**
 * Applies all drifts for a single table, including destructive operations.
 *
 * @param db - The database to update
 * @param tableName - The table name
 * @param drifts - The drifts for this table
 * @param schema - The schema for context
 * @param schemaMap - Mapping of schema statements
 */
function applyFullDestructiveUpdatesToTable(
  db: SqliteDatabase,
  tableName: string,
  drifts: Drift[],
  schema: DatabaseSchema,
  schemaMap: Map<string, string>,
): void {
  const needsRebuild = drifts.some((d) => d.type === "need_to_rebuild_table");

  if (needsRebuild) {
    db.info(`Rebuilding table: ${tableName}`);
    performTableRebuild(db, schema, tableName);
  } else {
    // Apply non-rebuild drifts for this table
    for (const drift of drifts) {
      if (drift.type === "need_to_create_table") {
        const createStatement = schemaMap.get(`table:${tableName}`);
        if (createStatement) {
          db.info(`Creating table: ${tableName}`);
          db.run(createStatement);
        }
      } else if (drift.type === "need_to_add_column") {
        const columnDef = drift.newDefinition;
        const sql = `alter table ${tableName} add column ${drift.columnName} ${columnDef};`;
        db.info(`Adding column: ${tableName}.${drift.columnName}`);
        db.run(sql);
      } else if (drift.type === "need_to_delete_column") {
        // SQLite doesn't support DROP COLUMN directly - would need rebuild
        db.warn(
          `Cannot drop column ${tableName}.${drift.columnName} without table rebuild`,
        );
      }
    }
  }
}

/**
 * Applies all drifts across the entire database, including destructive operations.
 * This includes:
 * - Creating new tables
 * - Adding nullable columns
 * - Rebuilding tables
 * - Deleting columns (via rebuild)
 * - Creating indexes
 * - Dropping extra tables
 *
 * @param db - The database to update
 * @param dbDrift - The database drift object
 * @param schema - The schema containing full CREATE statements
 */
export function applyFullDestructiveUpdates(
  db: SqliteDatabase,
  dbDrift: DatabaseDrift,
  schema: DatabaseSchema,
): void {
  const schemaMap = buildSchemaMap(schema);

  // Apply destructive updates for each table
  for (const [tableName, tableDrift] of dbDrift.tables.entries()) {
    if (tableName === "__schema__") {
      // Handle schema-level drifts (indexes, extra tables)
      for (const drift of tableDrift.drifts) {
        if (drift.type === "need_to_create_index") {
          const createStatement = schemaMap.get(`index:${drift.indexName}`);
          if (createStatement) {
            db.info(`Creating index: ${drift.indexName}`);
            db.run(createStatement);
          }
        } else if (drift.type === "extra_table") {
          db.info(`Dropping extra table: ${drift.tableName}`);
          db.run(`drop table ${drift.tableName};`);
        }
      }
    } else {
      // Handle table-level drifts
      applyFullDestructiveUpdatesToTable(
        db,
        tableName,
        tableDrift.drifts,
        schema,
        schemaMap,
      );
    }
  }
}

/**
 * Checks if the database has any tables or structures that are not part of the schema.
 * Logs warnings for any extra tables or indexes found.
 */
export function runDatabaseSloppynessCheck(
  db: SqliteDatabase,
  schema: DatabaseSchema,
): void {
  const drift = getDatabaseDrift(db, schema);

  // Log all warnings (which includes extra tables)
  for (const warning of drift.warnings) {
    db.warn(`${warning} (schemaName=${schema.name})`);
  }
}

export function runMigrationForCreateStatement(
  db: SqliteDatabase,
  createStatement: string,
  options: MigrationOptions,
) {
  const statement = parseSql(createStatement);
  // console.log(statement)
  if (statement.t === "pragma") {
    // Ignore PRAGMA statements in migrations
    return;
  } else if (statement.t == "create_table") {
    const existingTable: any = db.get(
      `select sql from sqlite_schema where name = ?`,
      statement.table_name,
    );

    if (!existingTable) {
      // Table doesn't exist yet, create it.
      db.run(createStatement);
      return;
    }

    // Get drifts for this table
    const tableParsed = parseCreateTable(statement);
    const drifts = findTableDrift(parseCreateTable(existingTable.sql), tableParsed);

    // Apply safe migrations or all migrations based on options
    for (const drift of drifts) {
      if (isDriftDestructive(drift) && !options.includeDestructive) {
        db.warn(`not automatically performing destructive migration: ${drift.type}`);
        if (drift.warning) {
          db.warn(`table ${statement.table_name} had migration warning: ${drift.warning}`);
        }
        continue;
      }

      // Apply the drift
      if (drift.type === "need_to_add_column") {
        const sql = `alter table ${statement.table_name} add column ${drift.columnName} ${drift.newDefinition};`;
        db.info(`migrating table ${statement.table_name}: ${sql}`);
        db.run(sql);
      } else if (drift.warning) {
        db.warn(`table ${statement.table_name} had migration warning: ${drift.warning}`);
      }
    }
  } else if (statement.t === "create_index") {
    const existingIndex: any = db.get(
      `select sql from sqlite_schema where name = ?`,
      statement.index_name,
    );

    if (!existingIndex) {
      // Index doesn't exist yet, create it.
      db.run(createStatement);
      return;
    }

    // TODO: Check if the index needs to be replaced/updated?

    return;
  } else {
    throw new Error(
      "Unsupported statement in migrate(). Only supporting 'create table' right now",
    );
  }
}
