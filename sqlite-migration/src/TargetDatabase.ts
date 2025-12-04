type GenericItem = Record<string, any>;

/**
 * Interface for database operations required by the migration system.
 * This allows the migration library to work with any SQLite wrapper.
 */
export interface TargetDatabase {
    /** Execute a query and return the first matching row */
    get(sql: string, ...params: any[]): Promise<GenericItem | undefined>;
    /** Execute a query and return all matching rows */
    list(sql: string, ...params: any[]): Promise<GenericItem[]>;
    /** Execute a statement that modifies the database */
    run(sql: string, ...params: any[]): Promise<void>;
    /** Execute a PRAGMA statement */
    pragma(statement: string): Promise<void>;
    /** Log an info message */
    info(msg: string): void;
    /** Log a warning message */
    warn(msg: string): void;
  }
  