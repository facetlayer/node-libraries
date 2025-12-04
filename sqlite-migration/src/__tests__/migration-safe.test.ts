import { describe, it, expect } from "vitest";
import { prepareSafeMigration } from "../migration-safe.ts";
import { DatabaseSchema, DatabaseDrift } from "../types.ts";

describe("generateSafeMigration", () => {
  it("should generate CREATE TABLE statement for new tables", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"],
    };
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [{ type: "need_to_create_table", tableName: "users" }] }],
      ]),
      warnings: [],
    };
    const result = prepareSafeMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0]).toBe("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
  });

  it("should generate ALTER TABLE for adding nullable columns", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"],
    };
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [{ type: "need_to_add_column", tableName: "users", columnName: "name", newDefinition: "TEXT" }] }],
      ]),
      warnings: [],
    };
    const result = prepareSafeMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0]).toBe("ALTER TABLE users ADD COLUMN name TEXT");
  });

  it("should generate CREATE INDEX statement", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE INDEX idx_users_name ON users(name)",
      ],
    };
    // Index drifts are now stored under the table they belong to
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [{ type: "need_to_create_index", indexName: "idx_users_name", tableName: "users" }] }],
      ]),
      warnings: [],
    };
    const result = prepareSafeMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0]).toBe("CREATE INDEX idx_users_name ON users(name)");
  });

  it("should generate ALTER TABLE for adding NOT NULL columns", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, age INTEGER NOT NULL DEFAULT 0)"],
    };
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [{ type: "need_to_add_column", tableName: "users", columnName: "age", newDefinition: "INTEGER NOT NULL DEFAULT 0" }] }],
      ]),
      warnings: [],
    };
    const result = prepareSafeMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0]).toBe("ALTER TABLE users ADD COLUMN age INTEGER NOT NULL DEFAULT 0");
  });

  it("should skip destructive operations and generate warnings", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };
    // Extra table drifts are now stored under the extra table's name
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["old_table", { drifts: [{ type: "extra_table", tableName: "old_table" }] }],
      ]),
      warnings: [],
    };
    const result = prepareSafeMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
