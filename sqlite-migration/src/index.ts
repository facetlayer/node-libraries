// Core types
export type {
  DatabaseSchema,
  MigrationType,
} from "./types.ts";

export { type TargetDatabase } from "./TargetDatabase.ts";

// Main API
export { applyMigration } from "./apply-migration.ts";

// For inspecting drifts before applying
export type { DatabaseDrift, TableDrift, Drift, DriftType } from "./types.ts";
export { findDatabaseDrift } from "./findDatabaseDrift.ts";

// For generating migration SQL statements
export { prepareSafeMigration } from "./migration-safe.ts";
export { prepareDestructiveMigration } from "./migration-destructive.ts";