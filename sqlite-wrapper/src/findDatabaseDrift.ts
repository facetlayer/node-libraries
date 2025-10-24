import { CreateTableStatement, CreateIndexStatement, parseSql } from "./parser";
import { SqliteDatabase } from "./SqliteDatabase";
import { DatabaseSchema } from "./DatabaseSchema";
import { Drift, DatabaseDrift, TableDrift } from "./migration";
import { getTableDrift } from "./migration";

/**
 * Analyzes the entire database and schema to find all drifts.
 * Returns both the drifts and any warnings about unsupported changes.
 *
 * @param db - The database to analyze
 * @param schema - The target schema
 * @returns DatabaseDrift with all drifts and warnings
 */
export function findDatabaseDrift(
  db: SqliteDatabase,
  schema: DatabaseSchema,
): DatabaseDrift {
  const tables = new Map<string, TableDrift>();
  const warnings: string[] = [];
  const schemaTables = new Map<string, CreateTableStatement>();
  const schemaIndexes = new Map<string, CreateIndexStatement>();
  const extraTableDrifts: Drift[] = [];
  const indexDrifts: Drift[] = [];

  // Parse all schema statements
  for (const statementText of schema.statements) {
    const statement = parseSql(statementText);

    if (statement.t === "create_table") {
      schemaTables.set(statement.table_name, statement);
    } else if (statement.t === "create_index") {
      schemaIndexes.set(statement.index_name, statement);
    }
  }

  // Check each table in the schema
  for (const [tableName, schemaTable] of schemaTables.entries()) {
    const existingTable: any = db.get(
      `select sql from sqlite_schema where name = ?`,
      tableName,
    );

    const tableDrifts: Drift[] = [];

    if (!existingTable) {
      // Table doesn't exist - need to create it
      tableDrifts.push({
        type: "need_to_create_table",
        tableName: tableName,
      });
    } else {
      // Table exists - check for column drifts
      tableDrifts.push(...getTableDrift(existingTable.sql, schemaTable.sql));
    }

    if (tableDrifts.length > 0) {
      tables.set(tableName, { drifts: tableDrifts });
    }
  }

  // Check for extra tables in the database (not in schema)
  for (const { name: foundTableName } of db.list(
    `select name from sqlite_schema where type='table'`,
  )) {
    if (foundTableName.startsWith("sqlite_")) continue;
    if (foundTableName.startsWith("_litestream")) continue;
    if (foundTableName === "dm_database_meta") continue;

    if (!schemaTables.has(foundTableName)) {
      extraTableDrifts.push({
        type: "extra_table",
        tableName: foundTableName,
      });
      warnings.push(
        `Database has a table that's not part of the app schema: ${foundTableName}`,
      );
    }
  }

  // Check each index in the schema
  for (const [indexName] of schemaIndexes.entries()) {
    const existingIndex: any = db.get(
      `select sql from sqlite_schema where name = ?`,
      indexName,
    );

    if (!existingIndex) {
      indexDrifts.push({
        type: "need_to_create_index",
        indexName: indexName,
      });
    }
    // TODO: Check if index needs to be replaced/updated
  }

  // Store extra tables and indexes in a synthetic entry
  if (extraTableDrifts.length > 0 || indexDrifts.length > 0) {
    tables.set("__schema__", {
      drifts: [...extraTableDrifts, ...indexDrifts],
    });
  }

  return { tables, warnings };
}
