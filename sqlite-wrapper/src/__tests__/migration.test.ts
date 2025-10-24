import { describe, it, expect, beforeEach } from "vitest";
import {
  runMigrationForCreateStatement,
  MigrationOptions,
  getTableDrift,
  getDatabaseDrift,
  applySafeUpgrades,
  applyFullDestructiveUpdates,
  isDriftDestructive,
} from "../migration";
import { SqliteDatabase } from "../SqliteDatabase";
import { DatabaseSchema } from "../DatabaseSchema";
import Database from "better-sqlite3";
import { Stream } from "@facetlayer/streams";
import type { DatabaseDrift, Drift } from "../migration";

// Helper function to flatten drifts for testing
function flattenDrifts(dbDrift: DatabaseDrift): Drift[] {
  const allDrifts: Drift[] = [];
  for (const tableDrift of dbDrift.tables.values()) {
    allDrifts.push(...tableDrift.drifts);
  }
  return allDrifts;
}

describe("runMigrationForCreateStatement", () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    const sqliteDb = new Database(":memory:");
    db = new SqliteDatabase(sqliteDb, Stream.newNullStream());
  });

  describe("PRAGMA statement handling", () => {
    it("should ignore PRAGMA statements and return without error", () => {
      const pragmaStatement = "PRAGMA foreign_keys = ON";

      // Should not throw an error and should return without doing anything
      expect(() => {
        runMigrationForCreateStatement(db, pragmaStatement, {});
      }).not.toThrow();
    });

    it("should ignore PRAGMA statements with function syntax", () => {
      const pragmaStatement = "PRAGMA table_info(users)";

      expect(() => {
        runMigrationForCreateStatement(db, pragmaStatement, {});
      }).not.toThrow();
    });

    it("should ignore PRAGMA statements with equals syntax", () => {
      const pragmaStatement = "PRAGMA journal_mode = WAL";

      expect(() => {
        runMigrationForCreateStatement(db, pragmaStatement, {});
      }).not.toThrow();
    });

    it("should ignore PRAGMA statements without affecting database state", () => {
      // Get initial state
      const initialTables = db.list(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      const initialCount = initialTables.length;

      // Run PRAGMA migration
      runMigrationForCreateStatement(db, "PRAGMA foreign_keys = ON", {});

      // Verify no tables were created or modified
      const finalTables = db.list(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      expect(finalTables.length).toBe(initialCount);
    });
  });

  describe("CREATE TABLE statement handling", () => {
    it("should create new table when it does not exist", () => {
      const createStatement =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";

      runMigrationForCreateStatement(db, createStatement, {});

      const tables = db.list(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      );
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe("users");
    });

    it("should handle table migration when table already exists", () => {
      // Create initial table
      db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

      // Try to "migrate" to the same schema (should not error)
      const createStatement =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";

      expect(() => {
        runMigrationForCreateStatement(db, createStatement, {});
      }).not.toThrow();
    });
  });

  describe("CREATE INDEX statement handling", () => {
    it("should create new index when it does not exist", () => {
      // First create a table for the index
      db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

      const createStatement = "CREATE INDEX idx_users_name ON users(name)";

      runMigrationForCreateStatement(db, createStatement, {});

      const indexes = db.list(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_name'",
      );
      expect(indexes).toHaveLength(1);
      expect(indexes[0].name).toBe("idx_users_name");
    });

    it("should handle index when it already exists", () => {
      // Create table and index
      db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
      db.run("CREATE INDEX idx_users_name ON users(name)");

      // Try to "migrate" the same index (should not error)
      const createStatement = "CREATE INDEX idx_users_name ON users(name)";

      expect(() => {
        runMigrationForCreateStatement(db, createStatement, {});
      }).not.toThrow();
    });
  });

  describe("unsupported statement handling", () => {
    it("should throw error for INSERT statements", () => {
      const insertStatement = 'INSERT INTO users (name) VALUES ("test")';

      expect(() => {
        runMigrationForCreateStatement(db, insertStatement, {});
      }).toThrow("Unsupported statement in migrate()");
    });
  });

  describe("mixed statements in schema", () => {
    it("should handle mix of CREATE and PRAGMA statements properly", () => {
      const options: MigrationOptions = {};

      // Should ignore PRAGMA and process CREATE TABLE
      runMigrationForCreateStatement(db, "PRAGMA foreign_keys = ON", options);
      runMigrationForCreateStatement(
        db,
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        options,
      );
      runMigrationForCreateStatement(db, "PRAGMA journal_mode = WAL", options);
      runMigrationForCreateStatement(
        db,
        "CREATE INDEX idx_users_name ON users(name)",
        options,
      );

      // Verify only the table and index were created
      const tables = db.list(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      );
      expect(tables).toHaveLength(1);

      const indexes = db.list(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_name'",
      );
      expect(indexes).toHaveLength(1);
    });
  });
});

describe("getTableDrift", () => {
  describe("column additions", () => {
    it("should detect when a new nullable column needs to be added", () => {
      const currentSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
      const targetSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)";

      const drifts = getTableDrift(currentSql, targetSql);

      expect(drifts).toHaveLength(1);
      expect(drifts[0]).toMatchObject({
        type: "need_to_add_column",
        tableName: "users",
        columnName: "email",
      });
    });

    it("should mark adding a 'not null' column as destructive", () => {
      const currentSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
      const targetSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER NOT NULL)";

      const drifts = getTableDrift(currentSql, targetSql);

      expect(drifts).toHaveLength(1);
      expect(drifts[0]).toMatchObject({
        type: "need_to_add_column",
        columnName: "age",
      });
    });
  });

  describe("column deletions", () => {
    it("should detect when a column needs to be deleted", () => {
      const currentSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)";
      const targetSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";

      const drifts = getTableDrift(currentSql, targetSql);

      expect(drifts).toHaveLength(1);
      expect(drifts[0]).toMatchObject({
        type: "need_to_delete_column",
        tableName: "users",
        columnName: "email",
      });
    });
  });

  describe("column modifications", () => {
    it("should detect column definition changes that only differ in 'not null'", () => {
      const currentSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
      const targetSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)";

      const drifts = getTableDrift(currentSql, targetSql);

      expect(drifts).toHaveLength(1);
      expect(drifts[0]).toMatchObject({
        type: "need_to_modify_column",
        columnName: "name",
        warning: "can't add/remove a 'not null' constraint",
      });
    });

    it("should detect column type changes as needing table rebuild", () => {
      const currentSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, age TEXT)";
      const targetSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, age INTEGER)";

      const drifts = getTableDrift(currentSql, targetSql);

      expect(drifts).toHaveLength(1);
      expect(drifts[0]).toMatchObject({
        type: "need_to_rebuild_table",
        columnName: "age",
      });
    });
  });

  describe("multiple changes", () => {
    it("should detect multiple column changes", () => {
      const currentSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age TEXT)";
      const targetSql =
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, email TEXT)";

      const drifts = getTableDrift(currentSql, targetSql);

      expect(drifts).toHaveLength(2);
      expect(drifts.map((d) => d.type)).toEqual([
        "need_to_rebuild_table",
        "need_to_add_column",
      ]);
    });
  });
});

describe("getDatabaseDrift", () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    const sqliteDb = new Database(":memory:");
    db = new SqliteDatabase(sqliteDb, Stream.newNullStream());
  });

  it("should detect when a table needs to be created", () => {
    db.run("CREATE TABLE existing (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE existing (id INTEGER PRIMARY KEY)",
        "CREATE TABLE new_table (id INTEGER PRIMARY KEY, name TEXT)",
      ],
    };

    const dbDrift = getDatabaseDrift(db, schema);
    const drifts = flattenDrifts(dbDrift);

    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      type: "need_to_create_table",
      tableName: "new_table",
    });
  });

  it("should detect extra tables not in schema", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    db.run("CREATE TABLE extra_table (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    const dbDrift = getDatabaseDrift(db, schema);
    const drifts = flattenDrifts(dbDrift);

    const extraTableDrift = drifts.find(
      (d) => d.type === "extra_table" && d.tableName === "extra_table"
    );
    expect(extraTableDrift).toBeDefined();
  });

  it("should ignore sqlite internal tables", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
    };

    const dbDrift = getDatabaseDrift(db, schema);
    const drifts = flattenDrifts(dbDrift);

    const sqliteTableDrifts = drifts.filter((d) =>
      d.tableName?.startsWith("sqlite_")
    );
    expect(sqliteTableDrifts).toHaveLength(0);
  });

  it("should detect column additions in existing tables", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
      ],
    };

    const dbDrift = getDatabaseDrift(db, schema);
    const drifts = flattenDrifts(dbDrift);

    const columnAddDrift = drifts.find(
      (d) => d.type === "need_to_add_column"
    );
    expect(columnAddDrift).toBeDefined();
    expect(columnAddDrift?.columnName).toBe("name");
  });

  it("should detect when an index needs to be created", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE INDEX idx_users_name ON users(name)",
      ],
    };

    const dbDrift = getDatabaseDrift(db, schema);
    const drifts = flattenDrifts(dbDrift);

    const indexDrift = drifts.find(
      (d) => d.type === "need_to_create_index"
    );
    expect(indexDrift).toBeDefined();
    expect(indexDrift?.indexName).toBe("idx_users_name");
  });
});

describe("applySafeUpgrades", () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    const sqliteDb = new Database(":memory:");
    db = new SqliteDatabase(sqliteDb, Stream.newNullStream());
  });

  it("should create new tables", () => {
    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: ["CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"],
    };

    const dbDrift: DatabaseDrift = {
      tables: new Map([
        [
          "users",
          {
            drifts: [
              {
                type: "need_to_create_table" as const,
                tableName: "users",
              },
            ],
          },
        ],
      ]),
      warnings: [],
    };

    applySafeUpgrades(db, dbDrift, schema);

    const tables = db.list(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    expect(tables).toHaveLength(1);
  });

  it("should add nullable columns", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
      ],
    };

    const dbDrift: DatabaseDrift = {
      tables: new Map([
        [
          "users",
          {
            drifts: [
              {
                type: "need_to_add_column" as const,
                tableName: "users",
                columnName: "name",
                newDefinition: "TEXT",
              },
            ],
          },
        ],
      ]),
      warnings: [],
    };

    applySafeUpgrades(db, dbDrift, schema);

    const columns = db.list("PRAGMA table_info(users)");
    const nameColumn = columns.find((c) => c.name === "name");
    expect(nameColumn).toBeDefined();
  });

  it("should create indexes", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE INDEX idx_users_name ON users(name)",
      ],
    };

    const dbDrift: DatabaseDrift = {
      tables: new Map([
        [
          "__schema__",
          {
            drifts: [
              {
                type: "need_to_create_index" as const,
                indexName: "idx_users_name",
              },
            ],
          },
        ],
      ]),
      warnings: [],
    };

    applySafeUpgrades(db, dbDrift, schema);

    const indexes = db.list(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_name'"
    );
    expect(indexes).toHaveLength(1);
  });

  it("should skip destructive operations and log warnings", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY)",
      ],
    };

    const dbDrift: DatabaseDrift = {
      tables: new Map([
        [
          "users",
          {
            drifts: [
              {
                type: "need_to_add_column" as const,
                tableName: "users",
                columnName: "age",
                newDefinition: "INTEGER NOT NULL",
              },
            ],
          },
        ],
      ]),
      warnings: [],
    };

    const warnings: string[] = [];
    db.logs.warn = (msg: string) => warnings.push(msg);

    applySafeUpgrades(db, dbDrift, schema);

    // Column should not have been added
    const columns = db.list("PRAGMA table_info(users)");
    const ageColumn = columns.find((c) => c.name === "age");
    expect(ageColumn).toBeUndefined();

    // Should have logged a warning
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("applyFullDestructiveUpdates", () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    const sqliteDb = new Database(":memory:");
    db = new SqliteDatabase(sqliteDb, Stream.newNullStream());
  });

  it("should handle all drift types including destructive ones", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    db.run("CREATE TABLE old_table (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE TABLE new_table (id INTEGER PRIMARY KEY)",
        "CREATE INDEX idx_users_name ON users(name)",
      ],
    };

    const dbDrift: DatabaseDrift = {
      tables: new Map([
        [
          "users",
          {
            drifts: [
              {
                type: "need_to_add_column" as const,
                tableName: "users",
                columnName: "name",
                newDefinition: "TEXT",
              },
            ],
          },
        ],
        [
          "new_table",
          {
            drifts: [
              {
                type: "need_to_create_table" as const,
                tableName: "new_table",
              },
            ],
          },
        ],
        [
          "__schema__",
          {
            drifts: [
              {
                type: "need_to_create_index" as const,
                indexName: "idx_users_name",
              },
              {
                type: "extra_table" as const,
                tableName: "old_table",
              },
            ],
          },
        ],
      ]),
      warnings: [],
    };

    applyFullDestructiveUpdates(db, dbDrift, schema);

    // Check table additions
    const newTable = db.list(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='new_table'"
    );
    expect(newTable).toHaveLength(1);

    // Check column addition
    const userColumns = db.list("PRAGMA table_info(users)");
    const nameColumn = userColumns.find((c) => c.name === "name");
    expect(nameColumn).toBeDefined();

    // Check extra table was dropped
    const oldTable = db.list(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='old_table'"
    );
    expect(oldTable).toHaveLength(0);

    // Check index was created
    const indexes = db.list(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_name'"
    );
    expect(indexes).toHaveLength(1);
  });

  it("should apply column additions without destructive flags", () => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY)");

    const schema: DatabaseSchema = {
      name: "test_schema",
      statements: [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)",
      ],
    };

    const dbDrift: DatabaseDrift = {
      tables: new Map([
        [
          "users",
          {
            drifts: [
              {
                type: "need_to_add_column" as const,
                tableName: "users",
                columnName: "name",
                newDefinition: "TEXT",
              },
              {
                type: "need_to_add_column" as const,
                tableName: "users",
                columnName: "email",
                newDefinition: "TEXT",
              },
            ],
          },
        ],
      ]),
      warnings: [],
    };

    applyFullDestructiveUpdates(db, dbDrift, schema);

    const columns = db.list("PRAGMA table_info(users)");
    expect(columns.some((c) => c.name === "name")).toBe(true);
    expect(columns.some((c) => c.name === "email")).toBe(true);
  });
});

describe("isDriftDestructive", () => {
  it("should identify destructive drift types", () => {
    const destructiveDrifts = [
      { type: "need_to_delete_column" as const, tableName: "users" },
      { type: "need_to_modify_column" as const, tableName: "users" },
      { type: "need_to_rebuild_table" as const, tableName: "users" },
      { type: "need_to_delete_index" as const, indexName: "idx_name" },
      { type: "extra_table" as const, tableName: "old_table" },
    ];

    destructiveDrifts.forEach((drift) => {
      expect(isDriftDestructive(drift)).toBe(true);
    });
  });

  it("should identify safe drift types", () => {
    const safeDrifts = [
      { type: "need_to_create_table" as const, tableName: "users" },
      {
        type: "need_to_add_column" as const,
        tableName: "users",
        columnName: "name",
        newDefinition: "TEXT",
      },
      { type: "need_to_create_index" as const, indexName: "idx_name" },
    ];

    safeDrifts.forEach((drift) => {
      expect(isDriftDestructive(drift)).toBe(false);
    });
  });
});
