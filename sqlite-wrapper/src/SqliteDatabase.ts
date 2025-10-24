import { ErrorDetails, Stream, captureError } from "@facetlayer/streams";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { DatabaseSchema } from "./DatabaseSchema";
import {
  MigrationOptions,
  runDatabaseSloppynessCheck,
} from "./migration";
import { parseSql } from "./parser";
import { performTableRebuild } from "./rebuildTable";
import { SingletonAccessor } from "./SingletonAccessor";
import {
  IncrementingIdOptions,
  SingletonIncrementingId,
} from "./SingletonIncrementingId";
import { SlowQueryWarning } from "./SlowQueryWarning";
import { upsert } from "./upsert";
import {
  prepareInsertStatement,
  prepareUpdateStatement,
} from "./statementBuilders";
import { applyMigration } from "./applyMigration";

function paramsToArray(params) {
  if (params === undefined) return [];

  if (Array.isArray(params)) return params;

  return [params];
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export class SqliteDatabase {
  db: BetterSqliteDatabase;
  logs: Stream;
  onRunStatement?: (sql: string, params: Array<any>) => void;

  constructor(db: BetterSqliteDatabase, logs: Stream) {
    if (!db) throw new Error("db is required");
    if (!logs) throw new Error("logs is required");

    this.db = db;
    this.logs = logs;
  }

  // Return first matching item
  get(sql: string, params?: any): any {
    const timer = new SlowQueryWarning(sql, (msg) => this.logs.warn(msg));
    try {
      params = paramsToArray(params);
      this.onRunStatement?.(sql, params);
      const statement = this.db.prepare(sql);
      const result = statement.get.apply(statement, params);
      timer.finish();
      return result;
    } catch (e) {
      timer.finish();
      const error = captureError(e, [{ sql }]);
      e.errorMessage = `Error trying to get() with SQL: ${e.message}`;
      this.error(captureError(error));
      throw e;
    }
  }

  // Return a list of items
  list(sql: string, params?: any): any[] {
    const timer = new SlowQueryWarning(sql, (msg) => this.logs.warn(msg));
    try {
      params = paramsToArray(params);
      this.onRunStatement?.(sql, params);
      const statement = this.db.prepare(sql);
      const result = statement.all.apply(statement, params);
      timer.finish();
      return result;
    } catch (e) {
      timer.finish();
      const error = captureError(e, [{ sql }]);
      e.errorMessage = `Error trying to list() with SQL: ${e.message}`;
      this.error(captureError(error));
      throw e;
    }
  }

  all(sql: string, params?: any): any[] {
    return this.list(sql, params);
  }

  *each(sql: string, params?: any) {
    if (typeof sql !== "string")
      throw new Error("first arg of each() should be a string");

    const timer = new SlowQueryWarning(sql, (msg) => this.logs.warn(msg));
    try {
      params = paramsToArray(params);
      this.onRunStatement?.(sql, params);
      const statement = this.db.prepare(sql);
      yield* statement.iterate.apply(statement, params);
      timer.finish();
    } catch (e) {
      timer.finish();
      this.error(captureError(e));
      throw e;
    }
  }

  run(sql: string, params?: any): RunResult {
    const timer = new SlowQueryWarning(sql, (msg) => this.logs.warn(msg));
    try {
      params = paramsToArray(params);
      this.onRunStatement?.(sql, params);
      const statement = this.db.prepare(sql);
      const result = statement.run.apply(statement, params);
      timer.finish();
      return result;
    } catch (e) {
      timer.finish();
      const error = captureError(e, [{ sql }]);
      e.errorMessage = `Error trying to run() SQL: ${e.message}`;
      this.error(captureError(error));
      throw e;
    }
  }

  pragma(statement: string) {
    const timer = new SlowQueryWarning(statement, (msg) => this.logs.warn(msg));
    try {
      this.onRunStatement?.(statement, []);
      const result = this.db.pragma(statement, { simple: true });
      timer.finish();
      return result;
    } catch (e) {
      timer.finish();
      this.error(captureError(e));
      throw e;
    }
  }

  // SQL building helper functions

  // sql: looks like "from table where ..."
  exists(sql: string, params?: any) {
    const selecting = `exists(select 1 ${sql})`;
    const result = this.get(`select ` + selecting, params);
    return result[selecting] == 1;
  }

  // sql: looks like "from table where ..."
  count(sql: string, params?: any): number {
    const result = this.get(`select count(*) ` + sql, params);
    return result["count(*)"];
  }

  insert(tableName: string, row: Record<string, any>) {
    const { sql, values } = prepareInsertStatement(tableName, row);
    return this.run(sql, values);
  }

  update(
    tableName: string,
    whereClause: Record<string, any>,
    row: Record<string, any>,
  ) {
    const { sql, values } = prepareUpdateStatement(tableName, whereClause, row);
    return this.run(sql, values);
  }

  upsert(
    tableName: string,
    whereClause: Record<string, any>,
    row: Record<string, any>,
  ) {
    return upsert(this, tableName, whereClause, row);
  }

  singleton(tableName: string) {
    return new SingletonAccessor(this, tableName);
  }

  incrementingId(tableName: string, options: IncrementingIdOptions = {}) {
    return new SingletonIncrementingId(this, tableName, options);
  }

  setupInitialData(statement: string) {
    const parsed = parseSql(statement);

    if (parsed.t !== "insert_item") {
      console.log(
        `expected insert statement in .initialData, found: ` + statement,
      );
      return;
    }

    const getExistingCount = this.get(
      `SELECT count(*) FROM ${parsed.table_name}`,
    );
    const count = getExistingCount["count(*)"];

    if (count === 0) {
      // Run the insert
      this.run(statement);
    }
  }

  migrateToSchema(schema: DatabaseSchema, options: MigrationOptions = {}) {
    applyMigration(this, schema, options);
  }

  performRebuild(schema: DatabaseSchema, tableName: string) {
    performTableRebuild(this, schema, tableName);
  }

  runDatabaseSloppynessCheck(schema: DatabaseSchema) {
    runDatabaseSloppynessCheck(this, schema);
  }

  error(error: ErrorDetails) {
    this.logs.logError({
      errorMessage: "SqliteDatabase error",
      ...error,
    });
  }

  warn(msg: any) {
    this.logs.warn(msg);
  }

  info(msg: any) {
    this.logs.info(msg);
  }

  close() {
    this.db.close();
  }
}
