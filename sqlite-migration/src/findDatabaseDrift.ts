import { CreateTableStatement, CreateIndexStatement, parseSql, parseCreateTable } from "./simple-sql-parser.ts";
import { DatabaseSchema, Drift, DatabaseDrift, TableDrift } from "./types.ts";
import { TargetDatabase } from "./TargetDatabase.ts";
import { findTableDrift } from "./findTableDrift.ts";

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
 * Helper to get or create a TableDrift entry in the map
 */
function getOrCreateTableDrift(tables: Map<string, TableDrift>, tableName: string): TableDrift {
  let tableDrift = tables.get(tableName);
  if (!tableDrift) {
    tableDrift = { drifts: [] };
    tables.set(tableName, tableDrift);
  }
  return tableDrift;
}

/**
 * Analyzes the entire database and schema to find all drifts.
 * Returns both the drifts and any warnings about unsupported changes.
 *
 * Drifts are organized by table name:
 * - need_to_create_table: stored under the table to be created
 * - need_to_create_index: stored under the table the index belongs to
 * - extra_table: stored under the extra table's name
 * - Column drifts: stored under the affected table
 *
 * @param db - The database to analyze
 * @param schema - The target schema
 * @returns DatabaseDrift with all drifts and warnings
 */
export async function findDatabaseDrift(
  db: TargetDatabase,
  schema: DatabaseSchema,
): Promise<DatabaseDrift> {
  const tables = new Map<string, TableDrift>();
  const warnings: string[] = [];
  const schemaTables = new Map<string, CreateTableStatement>();
  const schemaIndexes = new Map<string, CreateIndexStatement>();

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
    const existingTable: any = await db.get(
      `select sql from sqlite_schema where name = ?`,
      tableName,
    );

    if (!existingTable) {
      // Table doesn't exist - need to create it
      const tableDrift = getOrCreateTableDrift(tables, tableName);
      tableDrift.drifts.push({
        type: "need_to_create_table",
        tableName: tableName,
      });
    } else {
      // Table exists - check for column drifts
      const columnDrifts = getTableDrift(existingTable.sql, schemaTable.sql);
      if (columnDrifts.length > 0) {
        const tableDrift = getOrCreateTableDrift(tables, tableName);
        tableDrift.drifts.push(...columnDrifts);
      }
    }
  }

  // Check for extra tables in the database (not in schema)
  for (const { name: foundTableName } of await db.list(
    `select name from sqlite_schema where type='table'`,
  )) {
    if (foundTableName.startsWith("sqlite_")) continue;
    if (foundTableName.startsWith("_litestream")) continue;
    if (foundTableName === "dm_database_meta") continue;

    if (!schemaTables.has(foundTableName)) {
      const tableDrift = getOrCreateTableDrift(tables, foundTableName);
      tableDrift.drifts.push({
        type: "extra_table",
        tableName: foundTableName,
      });
      warnings.push(
        `Database has a table that's not part of the app schema: ${foundTableName}`,
      );
    }
  }

  // Check each index in the schema - store under the table the index belongs to
  for (const [indexName, indexStatement] of schemaIndexes.entries()) {
    const existingIndex: any = await db.get(
      `select sql from sqlite_schema where name = ?`,
      indexName,
    );

    if (!existingIndex) {
      // Store under the table this index belongs to
      const tableDrift = getOrCreateTableDrift(tables, indexStatement.table_name);
      tableDrift.drifts.push({
        type: "need_to_create_index",
        indexName: indexName,
        tableName: indexStatement.table_name,
      });
    }
    // TODO: Check if index needs to be replaced/updated
  }

  return { tables, warnings };
}
