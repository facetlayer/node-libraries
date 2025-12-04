import { describe, it, expect } from "vitest";
import { prepareDestructiveMigration } from "../migration-destructive.ts";
import { DatabaseSchema, DatabaseDrift } from "../types.ts";

describe("generateDestructiveUpdates", () => {
  it("should generate DROP TABLE for extra tables", () => {
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
    const result = prepareDestructiveMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0]).toBe("DROP TABLE old_table");
  });

  it("should generate ALTER TABLE for adding columns including NOT NULL", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, age INTEGER NOT NULL)"],
    };
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [{ type: "need_to_add_column", tableName: "users", columnName: "age", newDefinition: "INTEGER NOT NULL" }] }],
      ]),
      warnings: [],
    };
    const result = prepareDestructiveMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0]).toBe("ALTER TABLE users ADD COLUMN age INTEGER NOT NULL");
  });

  it("should generate warning for table rebuilds (not supported)", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, age INTEGER)"],
    };
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [{ type: "need_to_rebuild_table", tableName: "users", columnName: "age" }] }],
      ]),
      warnings: [],
    };
    const result = prepareDestructiveMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("rebuild");
  });

  it("should generate multiple statements for complex migrations", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE TABLE posts (id INTEGER PRIMARY KEY)",
        "CREATE INDEX idx_users_name ON users(name)",
      ],
    };
    // Drifts are now organized by the affected table:
    // - Column additions and index creations go under the table they affect
    // - Extra tables go under the extra table's name
    const dbDrift: DatabaseDrift = {
      tables: new Map([
        ["users", { drifts: [
          { type: "need_to_add_column", tableName: "users", columnName: "name", newDefinition: "TEXT" },
          { type: "need_to_create_index", indexName: "idx_users_name", tableName: "users" },
        ] }],
        ["posts", { drifts: [{ type: "need_to_create_table", tableName: "posts" }] }],
        ["old_table", { drifts: [{ type: "extra_table", tableName: "old_table" }] }],
      ]),
      warnings: [],
    };
    const result = prepareDestructiveMigration(dbDrift, schema);
    expect(result.statements).toHaveLength(4);
    expect(result.statements).toContain("ALTER TABLE users ADD COLUMN name TEXT");
    expect(result.statements).toContain("CREATE TABLE posts (id INTEGER PRIMARY KEY)");
    expect(result.statements).toContain("CREATE INDEX idx_users_name ON users(name)");
    expect(result.statements).toContain("DROP TABLE old_table");
  });
});
