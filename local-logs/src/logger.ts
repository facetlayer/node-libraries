import { initDatabase, getDatabase } from './database.ts';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEvent {
  id: number;
  level: LogLevel;
  message: string;
  params_json: string | null;
  timestamp: number;
  created_at: string;
}

export interface LoggerOptions {
  logPath?: string;
}

let _initialized = false;
let _defaultLogPath: string | undefined;

async function ensureInitialized(): Promise<void> {
  if (!_initialized) {
    await initDatabase();
    _initialized = true;
  }
}

function logEvent(level: LogLevel, message: string, params?: Record<string, unknown>, logPath?: string): void {
  if (!_initialized) {
    throw new Error('Logger not initialized. Call initLogger() first.');
  }

  const db = getDatabase(logPath ?? _defaultLogPath);
  const now = Date.now();

  db.insert('log_events', {
    level,
    message,
    params_json: params ? JSON.stringify(params) : null,
    timestamp: now,
    created_at: new Date(now).toISOString(),
  });
}

export async function initLogger(options: LoggerOptions = {}): Promise<void> {
  await ensureInitialized();
  _defaultLogPath = options.logPath;
}

export function info(message: string, params?: Record<string, unknown>): void {
  logEvent('info', message, params);
}

export function warn(message: string, params?: Record<string, unknown>): void {
  logEvent('warn', message, params);
}

export function error(message: string, params?: Record<string, unknown>): void {
  logEvent('error', message, params);
}

export function createLogger(options: LoggerOptions = {}) {
  const logPath = options.logPath;

  return {
    info: (message: string, params?: Record<string, unknown>) => logEvent('info', message, params, logPath),
    warn: (message: string, params?: Record<string, unknown>) => logEvent('warn', message, params, logPath),
    error: (message: string, params?: Record<string, unknown>) => logEvent('error', message, params, logPath),
  };
}
