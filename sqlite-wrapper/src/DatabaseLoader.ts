import { Stream } from "@facetlayer/streams";
import Database from "better-sqlite3";
import { DatabaseSchema } from "./DatabaseSchema";
import { getTableDrift } from "./migration";
import { MigrationBehavior } from "./MigrationBehavior";
import { parseSql } from "./parser";
import { SqliteDatabase } from "./SqliteDatabase";

export type LoadDatabaseFn = (filename: string) => Database.Database;

export interface DatabaseSetupOptions {
  filename: string;
  schema: DatabaseSchema;
  logs: Stream;

  // Wrap up the better-sqlite constructor in a pluggable callback. This library has a native module,
  // and we want to support a pluggable version.
  loadDatabase: LoadDatabaseFn;

  onRunStatement?: (sql: string, params: Array<any>) => void;
  migrationBehavior: MigrationBehavior;
}

export class DatabaseLoader {
  options: DatabaseSetupOptions;
  db: SqliteDatabase | null = null;

  constructor(options: DatabaseSetupOptions) {
    this.options = options;

    if (!this.options.loadDatabase) {
      throw new Error(".options.loadDatabase is missing");
    }
  }

  load() {
    if (!this.db) {
      const sqliteDb = this.options.loadDatabase(this.options.filename);
      this.db = new SqliteDatabase(sqliteDb, this.options.logs);

      const behavior = this.options.migrationBehavior;

      switch (behavior) {
        case "ignore":
          break;

        case "strict":
          // In strict mode, only check that the schema matches
          // Don't perform any migrations
          this.db.runDatabaseSloppynessCheck(this.options.schema);
          break;

        case "safe-upgrades":
          this.db.migrateToSchema(this.options.schema, {
            includeDestructive: false,
          });
          this.db.runDatabaseSloppynessCheck(this.options.schema);
          break;

        case "full-destructive-updates":
          // Perform all migrations including destructive ones
          this.db.migrateToSchema(this.options.schema, {
            includeDestructive: true,
          });
          this.performDestructiveRebuilds();
          this.dropLeftoverTables();
          this.db.runDatabaseSloppynessCheck(this.options.schema);
          break;

        default:
          throw new Error(
            `Invalid migration behavior: ${behavior}. Must be one of: strict, safe-upgrades, full-destructive-updates`,
          );
      }

      if (this.options.onRunStatement) {
        this.db.onRunStatement = this.options.onRunStatement;
      }
    }
    return this.db;
  }

  private dropLeftoverTables() {
    if (!this.db) return;

    const schemaTables = new Set<string>();

    for (const statementText of this.options.schema.statements) {
      const statement = parseSql(statementText);

      switch (statement.t) {
        case "create_table":
          schemaTables.add(statement.table_name);
          break;
        case "create_index":
          schemaTables.add(statement.index_name);
          break;
      }
    }

    const existingItems = this.db.list(
      `select name, type from sqlite_schema where type IN ('table', 'index')`,
    );

    for (const { name: itemName, type } of existingItems) {
      if (itemName.startsWith("sqlite_")) continue;
      if (itemName.startsWith("_litestream")) continue;
      if (itemName === "dm_database_meta") continue;

      if (!schemaTables.has(itemName)) {
        if (type === "table") {
          this.db.info(`Dropping leftover table: ${itemName}`);
          this.db.run(`DROP TABLE ${itemName}`);
        } else if (type === "index") {
          this.db.info(`Dropping leftover index: ${itemName}`);
          this.db.run(`DROP INDEX ${itemName}`);
        }
      }
    }
  }

  private performDestructiveRebuilds() {
    if (!this.db) return;

    for (const statementText of this.options.schema.statements) {
      const statement = parseSql(statementText);

      if (statement.t !== "create_table") continue;

      const existingTable: any = this.db.get(
        `select sql from sqlite_schema where name = ?`,
        statement.table_name,
      );

      if (!existingTable) continue;

      // Get drifts for this table
      const drifts = getTableDrift(existingTable.sql, statementText);

      // Check if any drift requires a rebuild
      const needsRebuild = drifts.some(
        (drift) =>
          drift.type === "need_to_rebuild_table" ||
          drift.type === "need_to_delete_column" ||
          drift.type === "need_to_modify_column",
      );

      if (needsRebuild) {
        this.db.info(
          `Performing destructive rebuild for table: ${statement.table_name}`,
        );
        this.db.performRebuild(this.options.schema, statement.table_name);
      }
    }
  }
}
