import { LoadDatabaseFn } from './DatabaseLoader';

export async function loadBetterSqlite(): Promise<LoadDatabaseFn> {
  const lib = await import('better-sqlite3');

  return (filename: string) => new lib.default(filename);
}
