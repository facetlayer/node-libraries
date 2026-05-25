import { describe, it, expect } from "vitest";
import {
  parseSql,
  stripSqlComments,
  createTableWithReplacedTableName,
  CreateTableStatement,
  getLeadingKeyword,
  isQueryStatement,
} from "../parser";

describe("stripSqlComments", () => {
  it("strips line comments", () => {
    const sql = "CREATE TABLE foo (id INTEGER -- primary key\n)";
    expect(stripSqlComments(sql)).toBe("CREATE TABLE foo (id INTEGER \n)");
  });

  it("strips block comments", () => {
    const sql = "CREATE TABLE foo (id /* the id */ INTEGER)";
    expect(stripSqlComments(sql)).toBe("CREATE TABLE foo (id  INTEGER)");
  });

  it("preserves single-quoted strings containing --", () => {
    const sql = "INSERT INTO foo VALUES ('hello -- world')";
    expect(stripSqlComments(sql)).toBe("INSERT INTO foo VALUES ('hello -- world')");
  });

  it("preserves single-quoted strings containing /*", () => {
    const sql = "INSERT INTO foo VALUES ('hello /* world */')";
    expect(stripSqlComments(sql)).toBe("INSERT INTO foo VALUES ('hello /* world */')");
  });

  it("handles escaped quotes in strings", () => {
    const sql = "INSERT INTO foo VALUES ('it''s -- fine')";
    expect(stripSqlComments(sql)).toBe("INSERT INTO foo VALUES ('it''s -- fine')");
  });

  it("strips multiple line comments", () => {
    const sql =
      "CREATE TABLE foo (\n  id INTEGER, -- the id\n  name TEXT -- the name\n)";
    expect(stripSqlComments(sql)).toBe(
      "CREATE TABLE foo (\n  id INTEGER, \n  name TEXT \n)"
    );
  });

  it("returns unchanged SQL with no comments", () => {
    const sql = "CREATE TABLE foo (id INTEGER, name TEXT)";
    expect(stripSqlComments(sql)).toBe(sql);
  });
});

describe("parseSql with IF NOT EXISTS", () => {
  it("parses CREATE TABLE IF NOT EXISTS", () => {
    const sql = `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )`;

    const result = parseSql(sql) as CreateTableStatement;
    expect(result.t).toBe("create_table");
    expect(result.table_name).toBe("users");
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0]).toEqual({
      name: "id",
      definition: "INTEGER PRIMARY KEY",
    });
    expect(result.columns[1]).toEqual({
      name: "name",
      definition: "TEXT NOT NULL",
    });
  });
});

describe("parseSql with comments", () => {
  it("parses CREATE TABLE with inline line comments", () => {
    const sql = `CREATE TABLE users (
      id INTEGER PRIMARY KEY, -- User ID
      name TEXT NOT NULL, -- Full name
      email TEXT -- Email address
    )`;

    const result = parseSql(sql) as CreateTableStatement;
    expect(result.t).toBe("create_table");
    expect(result.table_name).toBe("users");
    expect(result.columns).toHaveLength(3);
    expect(result.columns[0]).toEqual({
      name: "id",
      definition: "INTEGER PRIMARY KEY",
    });
    expect(result.columns[1]).toEqual({
      name: "name",
      definition: "TEXT NOT NULL",
    });
    expect(result.columns[2]).toEqual({
      name: "email",
      definition: "TEXT",
    });
  });

  it("parses CREATE TABLE with block comments", () => {
    const sql = `CREATE TABLE items (
      id INTEGER PRIMARY KEY,
      /* JSON array of allowed uses */
      allowed_uses TEXT,
      status TEXT NOT NULL
    )`;

    const result = parseSql(sql) as CreateTableStatement;
    expect(result.columns).toHaveLength(3);
    expect(result.columns[1]).toEqual({
      name: "allowed_uses",
      definition: "TEXT",
    });
  });

  it("parses CREATE TABLE with trailing comment after closing paren", () => {
    const sql = `CREATE TABLE config (
      key TEXT PRIMARY KEY,
      value TEXT
    ) -- end of config table`;

    const result = parseSql(sql) as CreateTableStatement;
    expect(result.table_name).toBe("config");
    expect(result.columns).toHaveLength(2);
  });

  it("handles the ticket scenario: comment after column causes misparsing", () => {
    // This is the exact scenario from ticket tk-146a7029:
    // A table created with inline comments, read back from sqlite_schema
    const sql = `CREATE TABLE mydata (
      id INTEGER PRIMARY KEY,
      allowed_uses TEXT, -- JSON array
      status TEXT NOT NULL
    )`;

    const result = parseSql(sql) as CreateTableStatement;
    expect(result.columns).toHaveLength(3);
    // The critical check: "allowed_uses" definition should be just "TEXT",
    // not "TEXT, -- JSON array" or something broken
    expect(result.columns[1]).toEqual({
      name: "allowed_uses",
      definition: "TEXT",
    });
    expect(result.columns[2]).toEqual({
      name: "status",
      definition: "TEXT NOT NULL",
    });
  });
});

describe("createTableWithReplacedTableName", () => {
  it("replaces table name in simple CREATE TABLE", () => {
    const sql = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
    const result = createTableWithReplacedTableName(sql, "tmp_users");
    expect(result).toContain("create table tmp_users");
    expect(result).toContain("id INTEGER PRIMARY KEY");
  });

  it("handles CREATE TABLE IF NOT EXISTS", () => {
    const sql = "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)";
    const result = createTableWithReplacedTableName(sql, "tmp_users");
    expect(result).toContain("create table tmp_users");
    expect(result).toContain("id INTEGER PRIMARY KEY");
    expect(result).not.toContain("IF");
  });
});

describe("getLeadingKeyword", () => {
  it("reads the leading keyword, lowercased", () => {
    expect(getLeadingKeyword("SELECT * FROM users")).toBe("select");
    expect(getLeadingKeyword("insert into t values (1)")).toBe("insert");
    expect(getLeadingKeyword("  UPDATE t SET x = 1")).toBe("update");
  });

  it("ignores leading comments", () => {
    expect(getLeadingKeyword("-- a comment\nSELECT 1")).toBe("select");
    expect(getLeadingKeyword("/* block */ DELETE FROM t")).toBe("delete");
  });

  it("returns empty string for blank input", () => {
    expect(getLeadingKeyword("")).toBe("");
    expect(getLeadingKeyword("   \n  ")).toBe("");
  });
});

describe("isQueryStatement", () => {
  it("treats SELECT / WITH / EXPLAIN / VALUES as queries", () => {
    expect(isQueryStatement("SELECT 1")).toBe(true);
    expect(isQueryStatement("with cte as (select 1) select * from cte")).toBe(true);
    expect(isQueryStatement("EXPLAIN QUERY PLAN SELECT 1")).toBe(true);
    expect(isQueryStatement("VALUES (1), (2)")).toBe(true);
  });

  it("treats writes and DDL as non-queries", () => {
    expect(isQueryStatement("INSERT INTO t VALUES (1)")).toBe(false);
    expect(isQueryStatement("UPDATE t SET x = 1")).toBe(false);
    expect(isQueryStatement("DELETE FROM t")).toBe(false);
    expect(isQueryStatement("CREATE TABLE t (id INTEGER)")).toBe(false);
  });

  it("is not fooled by a leading comment before a SELECT", () => {
    expect(isQueryStatement("-- fetch rows\nSELECT * FROM t")).toBe(true);
  });
});
