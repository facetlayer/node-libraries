import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyMigration, shouldRetryOnError } from "../applyMigration";
import { SqliteDatabase } from "../SqliteDatabase";
import { DatabaseSchema } from "../DatabaseSchema";
import Database from "better-sqlite3";
import { Stream } from "@facetlayer/streams";
import * as migration from "../migration";
import * as findDatabaseDriftModule from "../findDatabaseDrift";

describe("shouldRetryOnError", () => {
  it("should return true for 'table already exists' error", () => {
    const err = new Error("table users already exists");
    expect(shouldRetryOnError(err)).toBe(true);
  });

  it("should return true for 'TABLE already exists' error (case insensitive)", () => {
    const err = new Error("TABLE users ALREADY EXISTS");
    expect(shouldRetryOnError(err)).toBe(true);
  });

  it("should return true for 'index already exists' error", () => {
    const err = new Error("index idx_users_email already exists");
    expect(shouldRetryOnError(err)).toBe(true);
  });

  it("should return true for 'duplicate column name' error", () => {
    const err = new Error("duplicate column name: email");
    expect(shouldRetryOnError(err)).toBe(true);
  });

  it("should return false for other SQLite errors", () => {
    const err = new Error("UNIQUE constraint failed: users.email");
    expect(shouldRetryOnError(err)).toBe(false);
  });

  it("should return false for syntax errors", () => {
    const err = new Error("near 'SELECT': syntax error");
    expect(shouldRetryOnError(err)).toBe(false);
  });

  it("should return false for null/undefined errors", () => {
    expect(shouldRetryOnError(null)).toBe(false);
    expect(shouldRetryOnError(undefined)).toBe(false);
  });

  it("should handle error objects without message property", () => {
    const err = { toString: () => "table foo already exists" };
    expect(shouldRetryOnError(err)).toBe(true);
  });
});

describe("applyMigration retry behavior", () => {
  let db: SqliteDatabase;
  let schema: DatabaseSchema;

  beforeEach(() => {
    const sqliteDb = new Database(":memory:");
    db = new SqliteDatabase(sqliteDb, Stream.newNullStream());

    schema = {
      name: "test-schema",
      statements: [
        `CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )`,
      ],
    };
  });

  it("should succeed on first attempt when no errors occur", () => {
    // This should work without any retries
    expect(() => {
      applyMigration(db, schema, {});
    }).not.toThrow();

    // Verify table was created
    const result = db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    expect(result).toBeDefined();
    expect(result.name).toBe("users");
  });

  it("should retry and succeed when encountering 'table already exists' error", () => {
    const findDatabaseDriftSpy = vi.spyOn(findDatabaseDriftModule, "findDatabaseDrift");
    const applySafeUpgradesSpy = vi.spyOn(migration, "applySafeUpgrades");

    // Simulate concurrent migration: first call throws "table already exists"
    // Second call succeeds (table already created by concurrent process)
    let callCount = 0;
    applySafeUpgradesSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("table users already exists");
      }
      // Second call succeeds (no-op since drift is already applied)
    });

    // Should not throw - should retry and succeed
    expect(() => {
      applyMigration(db, schema, {});
    }).not.toThrow();

    // Should have been called twice (initial + 1 retry)
    expect(applySafeUpgradesSpy).toHaveBeenCalledTimes(2);
    expect(findDatabaseDriftSpy).toHaveBeenCalledTimes(2);

    applySafeUpgradesSpy.mockRestore();
    findDatabaseDriftSpy.mockRestore();
  });

  it("should retry and succeed when encountering 'index already exists' error", () => {
    const applySafeUpgradesSpy = vi.spyOn(migration, "applySafeUpgrades");

    let callCount = 0;
    applySafeUpgradesSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("index idx_users_name already exists");
      }
    });

    expect(() => {
      applyMigration(db, schema, {});
    }).not.toThrow();

    expect(applySafeUpgradesSpy).toHaveBeenCalledTimes(2);
    applySafeUpgradesSpy.mockRestore();
  });

  it("should retry up to 3 times before throwing", () => {
    const applySafeUpgradesSpy = vi.spyOn(migration, "applySafeUpgrades");

    // Always throw a retryable error
    applySafeUpgradesSpy.mockImplementation(() => {
      throw new Error("table users already exists");
    });

    expect(() => {
      applyMigration(db, schema, {});
    }).toThrow("table users already exists");

    // Should have been called 3 times (initial + 2 retries)
    expect(applySafeUpgradesSpy).toHaveBeenCalledTimes(3);
    applySafeUpgradesSpy.mockRestore();
  });

  it("should not retry on non-retryable errors", () => {
    const applySafeUpgradesSpy = vi.spyOn(migration, "applySafeUpgrades");

    applySafeUpgradesSpy.mockImplementation(() => {
      throw new Error("UNIQUE constraint failed: users.email");
    });

    expect(() => {
      applyMigration(db, schema, {});
    }).toThrow("UNIQUE constraint failed: users.email");

    // Should only be called once (no retries)
    expect(applySafeUpgradesSpy).toHaveBeenCalledTimes(1);
    applySafeUpgradesSpy.mockRestore();
  });

  it("should log retry attempts", () => {
    const infoSpy = vi.spyOn(db, "info");
    const applySafeUpgradesSpy = vi.spyOn(migration, "applySafeUpgrades");

    let callCount = 0;
    applySafeUpgradesSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("table users already exists");
      }
    });

    applyMigration(db, schema, {});

    // Should have logged the retry
    expect(infoSpy).toHaveBeenCalledWith(
      "Migration attempt 1 failed with retryable error, retrying..."
    );

    infoSpy.mockRestore();
    applySafeUpgradesSpy.mockRestore();
  });

  it("should work with destructive migrations", () => {
    const applyFullDestructiveUpdatesSpy = vi.spyOn(
      migration,
      "applyFullDestructiveUpdates"
    );

    let callCount = 0;
    applyFullDestructiveUpdatesSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("table users already exists");
      }
    });

    expect(() => {
      applyMigration(db, schema, { includeDestructive: true });
    }).not.toThrow();

    expect(applyFullDestructiveUpdatesSpy).toHaveBeenCalledTimes(2);
    applyFullDestructiveUpdatesSpy.mockRestore();
  });

  it("should not retry setupInitialData errors", () => {
    const schemaWithInitialData: DatabaseSchema = {
      name: "test-schema",
      statements: [
        `CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )`,
      ],
      initialData: [
        `INSERT INTO users (id, name) VALUES (1, 'Admin')`,
      ],
    };

    // First, apply the schema successfully
    applyMigration(db, schemaWithInitialData, {});

    // Verify initial data was inserted
    const result = db.get("SELECT * FROM users WHERE id = 1");
    expect(result).toBeDefined();
    expect(result.name).toBe("Admin");

    // Now test that if setupInitialData fails, it's not retried
    const setupInitialDataSpy = vi.spyOn(db, "setupInitialData");
    setupInitialDataSpy.mockImplementation(() => {
      throw new Error("table users already exists");
    });

    // Should throw on first attempt without retrying
    expect(() => {
      applyMigration(db, schemaWithInitialData, {});
    }).toThrow("table users already exists");

    // setupInitialData should only be called once per initial data statement
    // (after successful schema migration)
    expect(setupInitialDataSpy).toHaveBeenCalledTimes(1);
    setupInitialDataSpy.mockRestore();
  });

  it("should handle duplicate column name errors", () => {
    const applySafeUpgradesSpy = vi.spyOn(migration, "applySafeUpgrades");

    let callCount = 0;
    applySafeUpgradesSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("duplicate column name: email");
      }
    });

    expect(() => {
      applyMigration(db, schema, {});
    }).not.toThrow();

    expect(applySafeUpgradesSpy).toHaveBeenCalledTimes(2);
    applySafeUpgradesSpy.mockRestore();
  });
});
