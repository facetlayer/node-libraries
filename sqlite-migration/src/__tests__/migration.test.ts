import { describe, it, expect, beforeEach } from "vitest";
import { getTableDrift, findDatabaseDrift } from "../findDatabaseDrift.ts";
import { DatabaseSchema, DatabaseDrift, Drift } from "../types.ts";
import { TargetDatabase } from "../TargetDatabase.ts";
import Database from "better-sqlite3";

// Helper to create a MigrationDatabase from better-sqlite3
function createMigrationDb(sqliteDb: Database.Database): TargetDatabase {
  return {
    get: async (sql: string, ...params: any[]) => sqliteDb.prepare(sql).get(...params),
    list: async (sql: string, ...params: any[]) => sqliteDb.prepare(sql).all(...params),
    run: async (sql: string, ...params: any[]) => sqliteDb.prepare(sql).run(...params),
    pragma: async (statement: string) => { sqliteDb.pragma(statement, { simple: true }); },
    info: () => {},
    warn: () => {},
  };
}

// Helper function to flatten drifts for testing
function flattenDrifts(dbDrift: DatabaseDrift): Drift[] {
  const allDrifts: Drift[] = [];
  for (const tableDrift of dbDrift.tables.values()) {
    allDrifts.push(...tableDrift.drifts);
  }
  return allDrifts;
}

describe("getTableDrift", () => {
  it("should detect when a new nullable column needs to be added", () => {
    const drifts = getTableDrift(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)"
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      type: "need_to_add_column",
      tableName: "users",
      columnName: "email",
    });
  });

  it("should detect when a column needs to be deleted", () => {
    const drifts = getTableDrift(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      type: "need_to_delete_column",
      columnName: "email",
    });
  });

  it("should detect column type changes as needing table rebuild", () => {
    const drifts = getTableDrift(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, age TEXT)",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, age INTEGER)"
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      type: "need_to_rebuild_table",
      columnName: "age",
    });
  });
});

describe("findDatabaseDrift", () => {
  let db: TargetDatabase;
  let sqliteDb: Database.Database;

  beforeEach(() => {
    sqliteDb = new Database(":memory:");
    db = createMigrationDb(sqliteDb);
  });

  describe("table creation", () => {
    it("should detect when a table needs to be created", async () => {
      await db.run("CREATE TABLE existing (id INTEGER PRIMARY KEY)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: [
          "CREATE TABLE existing (id INTEGER PRIMARY KEY)",
          "CREATE TABLE new_table (id INTEGER PRIMARY KEY, name TEXT)",
        ],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      // Should be stored under the table name "new_table"
      expect(dbDrift.tables.has("new_table")).toBe(true);
      const tableDrift = dbDrift.tables.get("new_table")!;
      expect(tableDrift.drifts).toHaveLength(1);
      expect(tableDrift.drifts[0]).toMatchObject({
        type: "need_to_create_table",
        tableName: "new_table",
      });
    });
  });

  describe("extra tables", () => {
    it("should detect extra tables not in schema", async () => {
      await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
      await db.run("CREATE TABLE extra_table (id INTEGER PRIMARY KEY)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      // Should be stored under the extra table's name
      expect(dbDrift.tables.has("extra_table")).toBe(true);
      const tableDrift = dbDrift.tables.get("extra_table")!;
      expect(tableDrift.drifts).toHaveLength(1);
      expect(tableDrift.drifts[0]).toMatchObject({
        type: "extra_table",
        tableName: "extra_table",
      });
    });

    it("should add warning for extra tables", async () => {
      await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
      await db.run("CREATE TABLE orphan (id INTEGER PRIMARY KEY)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      expect(dbDrift.warnings).toHaveLength(1);
      expect(dbDrift.warnings[0]).toContain("orphan");
    });
  });

  describe("index creation", () => {
    it("should detect when an index needs to be created", async () => {
      await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: [
          "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
          "CREATE INDEX idx_users_name ON users(name)",
        ],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      // Index drift should be stored under the table "users" (the table the index belongs to)
      expect(dbDrift.tables.has("users")).toBe(true);
      const tableDrift = dbDrift.tables.get("users")!;
      expect(tableDrift.drifts).toHaveLength(1);
      expect(tableDrift.drifts[0]).toMatchObject({
        type: "need_to_create_index",
        indexName: "idx_users_name",
        tableName: "users",
      });
    });

    it("should group index drift with column drifts for the same table", async () => {
      await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: [
          "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
          "CREATE INDEX idx_users_name ON users(name)",
        ],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      // Both drifts should be under "users"
      expect(dbDrift.tables.has("users")).toBe(true);
      const tableDrift = dbDrift.tables.get("users")!;
      expect(tableDrift.drifts).toHaveLength(2);
      expect(tableDrift.drifts.find((d) => d.type === "need_to_add_column")).toBeDefined();
      expect(tableDrift.drifts.find((d) => d.type === "need_to_create_index")).toBeDefined();
    });
  });

  describe("column changes", () => {
    it("should detect column additions in existing tables", async () => {
      await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      expect(dbDrift.tables.has("users")).toBe(true);
      const tableDrift = dbDrift.tables.get("users")!;
      expect(tableDrift.drifts.find((d) => d.type === "need_to_add_column")).toBeDefined();
    });
  });

  describe("no __schema__ entries", () => {
    it("should never have a __schema__ entry in the tables map", async () => {
      await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
      await db.run("CREATE TABLE extra (id INTEGER PRIMARY KEY)");
      const schema: DatabaseSchema = {
        name: "test_schema",
        statements: [
          "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
          "CREATE INDEX idx_users_name ON users(name)",
        ],
      };
      const dbDrift = await findDatabaseDrift(db, schema);

      // __schema__ should never exist
      expect(dbDrift.tables.has("__schema__")).toBe(false);

      // All drifts should be under real table names
      for (const [tableName] of dbDrift.tables.entries()) {
        expect(tableName).not.toBe("__schema__");
      }
    });
  });
});
