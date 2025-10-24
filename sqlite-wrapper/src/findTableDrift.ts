import { CreateTableStatement } from "./parser";
import { Drift } from "./migration";

/**
 * Helper function to find a column by name in a table
 */
export function findColumn(
  table: CreateTableStatement,
  name: string,
): CreateTableStatement["columns"][number] | null {
  for (const column of table.columns) if (column.name === name) return column;
  return null;
}

/**
 * Compares two table schemas and returns the drifts needed to migrate from
 * the current schema to the target schema.
 *
 * @param currentTable - The current CREATE TABLE statement (from database)
 * @param targetTable - The target CREATE TABLE statement (from schema)
 * @returns Array of Drift objects describing the differences
 */
export function findTableDrift(
  currentTable: CreateTableStatement,
  targetTable: CreateTableStatement,
): Drift[] {
  const drifts: Drift[] = [];

  // Iterate over columns that exist in current table.
  for (const currentColumn of currentTable.columns) {
    const targetColumn = findColumn(targetTable, currentColumn.name);

    if (!targetColumn) {
      // Column does not exist in target table, so we need to delete it.
      drifts.push({
        type: "need_to_delete_column",
        tableName: currentTable.table_name,
        columnName: currentColumn.name,
        oldDefinition: currentColumn.definition,
      });
      continue;
    }

    // Check if column definitions differ
    if (currentColumn.definition !== targetColumn.definition) {
      const currentDefWithoutNotNull = currentColumn.definition
        .replace(/not null ?/i, "")
        .trim();
      const targetDefWithoutNotNull = targetColumn.definition
        .replace(/not null ?/i, "")
        .trim();

      if (currentDefWithoutNotNull === targetDefWithoutNotNull) {
        // Only "not null" constraint differs
        drifts.push({
          type: "need_to_modify_column",
          tableName: currentTable.table_name,
          columnName: currentColumn.name,
          oldDefinition: currentColumn.definition,
          newDefinition: targetColumn.definition,
          warning: "can't add/remove a 'not null' constraint",
        });
      } else {
        // Actual definition differs - requires rebuild
        drifts.push({
          type: "need_to_rebuild_table",
          tableName: currentTable.table_name,
          columnName: currentColumn.name,
          oldDefinition: currentColumn.definition,
          newDefinition: targetColumn.definition,
          warning: `Column modification not supported (${currentColumn.name})`,
        });
      }
    }
  }

  // Check for columns that exist in target but not in current (need to add)
  for (const targetColumn of targetTable.columns) {
    const currentColumn = findColumn(currentTable, targetColumn.name);

    if (!currentColumn) {
      const hasNotNull =
        targetColumn.definition.toLowerCase().includes("not null");

      drifts.push({
        type: "need_to_add_column",
        tableName: currentTable.table_name,
        columnName: targetColumn.name,
        newDefinition: targetColumn.definition,
        warning: hasNotNull
          ? `Adding 'not null' column requires table rebuild`
          : undefined,
      });
    }
  }

  return drifts;
}
