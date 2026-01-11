import { DatabaseLoader, loadBetterSqlite, SqliteDatabase, LoadDatabaseFn } from '@facetlayer/sqlite-wrapper';
import { Stream } from '@facetlayer/streams';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_LOG_PATH = '.logs/logs.db';

let _loadDatabaseFn: LoadDatabaseFn | null = null;
const _dbLoaders = new Map<string, DatabaseLoader>();

export const schema = {
  name: 'LocalLogs',
  statements: [
    `CREATE TABLE log_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      params_json TEXT,
      timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_log_events_timestamp ON log_events(timestamp)`,
    `CREATE INDEX idx_log_events_level ON log_events(level)`,
  ],
};

export async function initDatabase(): Promise<void> {
  if (!_loadDatabaseFn) {
    _loadDatabaseFn = await loadBetterSqlite();
  }
}

export function getDatabase(logPath: string = DEFAULT_LOG_PATH): SqliteDatabase {
  if (!_loadDatabaseFn) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const absolutePath = path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);

  if (!_dbLoaders.has(absolutePath)) {
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logs = new Stream<string>();

    _dbLoaders.set(absolutePath, new DatabaseLoader({
      filename: absolutePath,
      schema,
      logs,
      loadDatabase: _loadDatabaseFn,
      migrationBehavior: 'safe-upgrades',
    }));
  }

  return _dbLoaders.get(absolutePath)!.load();
}

export function getDatabasePath(logPath: string = DEFAULT_LOG_PATH): string {
  return path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);
}
