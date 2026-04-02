/**
 * PrismDatabase
 *
 * Common database interface that can be satisfied by different SQLite implementations:
 * - @facetlayer/sqlite-wrapper (Node.js, uses better-sqlite3)
 * - ExpoSqliteDatabase (React Native, uses expo-sqlite)
 */
export interface PrismDatabase {
  get(sql: string, params?: any): any;
  list(sql: string, params?: any): any[];
  run(sql: string, params?: any): { changes: number; lastInsertRowid: number | bigint };
  close(): void;
}
