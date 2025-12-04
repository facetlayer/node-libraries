import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyMigration, shouldRetryOnError } from "../apply-migration.ts";
import { DatabaseSchema } from "../types.ts";
import { TargetDatabase } from "../TargetDatabase.ts";
import Database from "better-sqlite3";
import * as safeMigration from "../migration-safe.ts";
import * as destructiveMigration from "../migration-destructive.ts";

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

describe("shouldRetryOnError", () => {
  it("should return true for 'table already exists' error", () => {
    expect(shouldRetryOnError(new Error("table users already exists"))).toBe(true);
  });

  it("should return true for 'index already exists' error", () => {
    expect(shouldRetryOnError(new Error("index idx_users_email already exists"))).toBe(true);
  });

  it("should return true for 'duplicate column name' error", () => {
    expect(shouldRetryOnError(new Error("duplicate column name: email"))).toBe(true);
  });

  it("should return false for other SQLite errors", () => {
    expect(shouldRetryOnError(new Error("UNIQUE constraint failed: users.email"))).toBe(false);
  });

  it("should return false for null/undefined errors", () => {
    expect(shouldRetryOnError(null)).toBe(false);
    expect(shouldRetryOnError(undefined)).toBe(false);
  });
});

describe("applyMigration", () => {
  let db: TargetDatabase;
  let sqliteDb: Database.Database;

  beforeEach(() => {
    sqliteDb = new Database(":memory:");
    db = createMigrationDb(sqliteDb);
  });

  it("should create tables from schema", async () => {
    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"],
    };

    await applyMigration(db, schema, "safe-updates");

    const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    expect(result).toBeDefined();
    expect(result.name).toBe("users");
  });

  it("should add columns to existing tables", async () => {
    await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"],
    };

    await applyMigration(db, schema, "safe-updates");

    const columns = await db.list("PRAGMA table_info(users)");
    expect(columns.find((c: any) => c.name === "name")).toBeDefined();
  });

  it("should create indexes", async () => {
    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE INDEX idx_users_name ON users(name)",
      ],
    };

    await applyMigration(db, schema, "safe-updates");

    const indexes = await db.list("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_name'");
    expect(indexes).toHaveLength(1);
  });

  it("should drop extra tables when includeDestructive is true", async () => {
    await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    await db.run("CREATE TABLE extra_table (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    await applyMigration(db, schema, "destructive-updates");

    const extraTable = await db.list("SELECT name FROM sqlite_master WHERE type='table' AND name='extra_table'");
    expect(extraTable).toHaveLength(0);
  });

  it("should NOT drop extra tables when includeDestructive is false", async () => {
    await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    await db.run("CREATE TABLE extra_table (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    await applyMigration(db, schema, "safe-updates");

    const extraTable = await db.list("SELECT name FROM sqlite_master WHERE type='table' AND name='extra_table'");
    expect(extraTable).toHaveLength(1);
  });

  it("should log warnings from migration generation", async () => {
    await db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    await db.run("CREATE TABLE extra_table (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    const warnings: string[] = [];
    db.warn = (msg: string) => warnings.push(msg);

    await applyMigration(db, schema, "safe-updates");

    // Should warn about skipping destructive migration (extra table)
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("destructive");
  });

  it("should retry on concurrent migration errors", async () => {
    const prepareSafeMigrationSpy = vi.spyOn(safeMigration, "prepareSafeMigration");

    let callCount = 0;
    prepareSafeMigrationSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("table users already exists");
      }
      return { statements: [], warnings: [] };
    });

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    await expect(applyMigration(db, schema, "safe-updates")).resolves.not.toThrow();
    expect(prepareSafeMigrationSpy).toHaveBeenCalledTimes(2);

    prepareSafeMigrationSpy.mockRestore();
  });

  it("should throw after max retries", async () => {
    const prepareSafeMigrationSpy = vi.spyOn(safeMigration, "prepareSafeMigration");

    prepareSafeMigrationSpy.mockImplementation(() => {
      throw new Error("table users already exists");
    });

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    await expect(applyMigration(db, schema, "safe-updates")).rejects.toThrow("table users already exists");
    expect(prepareSafeMigrationSpy).toHaveBeenCalledTimes(3);

    prepareSafeMigrationSpy.mockRestore();
  });

  it("should not retry on non-retryable errors", async () => {
    const prepareSafeMigrationSpy = vi.spyOn(safeMigration, "prepareSafeMigration");

    prepareSafeMigrationSpy.mockImplementation(() => {
      throw new Error("syntax error");
    });

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    await expect(applyMigration(db, schema, "safe-updates")).rejects.toThrow("syntax error");
    expect(prepareSafeMigrationSpy).toHaveBeenCalledTimes(1);

    prepareSafeMigrationSpy.mockRestore();
  });

  it("should use prepareDestructiveMigration when includeDestructive is true", async () => {
    const prepareDestructiveMigrationSpy = vi.spyOn(destructiveMigration, "prepareDestructiveMigration");
    prepareDestructiveMigrationSpy.mockReturnValue({ statements: [], warnings: [] });

    const schema: DatabaseSchema = {
      name: "test-schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    await applyMigration(db, schema, "destructive-updates");

    expect(prepareDestructiveMigrationSpy).toHaveBeenCalled();
    prepareDestructiveMigrationSpy.mockRestore();
  });
});
