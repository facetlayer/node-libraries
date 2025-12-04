
export type MigrationType = "safe-updates" | "destructive-updates";

/**
 * Represents a database schema with CREATE TABLE and CREATE INDEX statements.
 */
export interface DatabaseSchema {
  name: string;
  statements: string[];
}

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
