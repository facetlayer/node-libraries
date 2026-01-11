#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initDatabase, getDatabase, getDatabasePath } from './database.ts';
import type { LogEvent, LogLevel } from './logger.ts';
import * as fs from 'fs';

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like: 30s, 5m, 1h, 7d`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

interface ListLogsOptions {
  logPath: string;
  since?: string;
  level?: LogLevel;
  limit: number;
  json: boolean;
}

function formatLogEvent(event: LogEvent): string {
  const date = new Date(event.timestamp).toISOString();
  const level = event.level.toUpperCase().padEnd(5);
  let line = `[${date}] ${level} ${event.message}`;

  if (event.params_json) {
    try {
      const params = JSON.parse(event.params_json);
      line += ` ${JSON.stringify(params)}`;
    } catch {
      line += ` ${event.params_json}`;
    }
  }

  return line;
}

async function listLogs(options: ListLogsOptions) {
  const dbPath = getDatabasePath(options.logPath);

  if (!fs.existsSync(dbPath)) {
    console.error(`Log database not found at: ${dbPath}`);
    process.exit(1);
  }

  await initDatabase();
  const db = getDatabase(options.logPath);

  let sql = 'SELECT * FROM log_events WHERE 1=1';
  const params: unknown[] = [];

  if (options.since) {
    const sinceMs = parseDuration(options.since);
    const sinceTimestamp = Date.now() - sinceMs;
    sql += ' AND timestamp >= ?';
    params.push(sinceTimestamp);
  }

  if (options.level) {
    sql += ' AND level = ?';
    params.push(options.level);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(options.limit);

  const events = db.list(sql, params) as LogEvent[];

  if (options.json) {
    console.log(JSON.stringify(events, null, 2));
  } else {
    // Reverse to show oldest first
    for (const event of events.reverse()) {
      console.log(formatLogEvent(event));
    }
  }
}

async function main() {
  await yargs(hideBin(process.argv))
    .option('log-path', {
      type: 'string',
      describe: 'Path to the log database',
      default: '.logs/logs.db',
    })
    .command(
      'list-recent',
      'List recent log events',
      (yargs) => {
        return yargs
          .option('since', {
            type: 'string',
            describe: 'Show logs since duration (e.g., 30s, 5m, 1h, 7d)',
          })
          .option('limit', {
            type: 'number',
            describe: 'Maximum number of logs to show',
            default: 100,
          })
          .option('json', {
            type: 'boolean',
            describe: 'Output as JSON',
            default: false,
          });
      },
      async (argv) => {
        try {
          await listLogs({
            logPath: argv['log-path'] as string,
            since: argv.since as string | undefined,
            limit: argv.limit as number,
            json: argv.json as boolean,
          });
        } catch (err) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      }
    )
    .command(
      'list-recent-errors',
      'List recent error log events',
      (yargs) => {
        return yargs
          .option('since', {
            type: 'string',
            describe: 'Show logs since duration (e.g., 30s, 5m, 1h, 7d)',
          })
          .option('limit', {
            type: 'number',
            describe: 'Maximum number of logs to show',
            default: 100,
          })
          .option('json', {
            type: 'boolean',
            describe: 'Output as JSON',
            default: false,
          });
      },
      async (argv) => {
        try {
          await listLogs({
            logPath: argv['log-path'] as string,
            since: argv.since as string | undefined,
            level: 'error',
            limit: argv.limit as number,
            json: argv.json as boolean,
          });
        } catch (err) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      }
    )
    .command(
      'list-recent-warnings',
      'List recent warning log events',
      (yargs) => {
        return yargs
          .option('since', {
            type: 'string',
            describe: 'Show logs since duration (e.g., 30s, 5m, 1h, 7d)',
          })
          .option('limit', {
            type: 'number',
            describe: 'Maximum number of logs to show',
            default: 100,
          })
          .option('json', {
            type: 'boolean',
            describe: 'Output as JSON',
            default: false,
          });
      },
      async (argv) => {
        try {
          await listLogs({
            logPath: argv['log-path'] as string,
            since: argv.since as string | undefined,
            level: 'warn',
            limit: argv.limit as number,
            json: argv.json as boolean,
          });
        } catch (err) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      }
    )
    .command(
      'stats',
      'Show log statistics',
      (yargs) => {
        return yargs
          .option('since', {
            type: 'string',
            describe: 'Show stats since duration (e.g., 30s, 5m, 1h, 7d)',
          })
          .option('json', {
            type: 'boolean',
            describe: 'Output as JSON',
            default: false,
          });
      },
      async (argv) => {
        try {
          const dbPath = getDatabasePath(argv['log-path'] as string);

          if (!fs.existsSync(dbPath)) {
            console.error(`Log database not found at: ${dbPath}`);
            process.exit(1);
          }

          await initDatabase();
          const db = getDatabase(argv['log-path'] as string);

          let whereClause = '';
          const params: unknown[] = [];

          if (argv.since) {
            const sinceMs = parseDuration(argv.since as string);
            const sinceTimestamp = Date.now() - sinceMs;
            whereClause = ' WHERE timestamp >= ?';
            params.push(sinceTimestamp);
          }

          const total = db.get(`SELECT COUNT(*) as count FROM log_events${whereClause}`, params) as { count: number };
          const byLevel = db.list(
            `SELECT level, COUNT(*) as count FROM log_events${whereClause} GROUP BY level`,
            params
          ) as { level: string; count: number }[];

          const stats = {
            total: total.count,
            byLevel: Object.fromEntries(byLevel.map(r => [r.level, r.count])),
          };

          if (argv.json) {
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log(`Total logs: ${stats.total}`);
            console.log('By level:');
            for (const [level, count] of Object.entries(stats.byLevel)) {
              console.log(`  ${level}: ${count}`);
            }
          }
        } catch (err) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      }
    )
    .command(
      'clear',
      'Clear all log events',
      (yargs) => {
        return yargs
          .option('before', {
            type: 'string',
            describe: 'Clear logs older than duration (e.g., 7d)',
          })
          .option('force', {
            type: 'boolean',
            describe: 'Skip confirmation',
            default: false,
          });
      },
      async (argv) => {
        try {
          const dbPath = getDatabasePath(argv['log-path'] as string);

          if (!fs.existsSync(dbPath)) {
            console.error(`Log database not found at: ${dbPath}`);
            process.exit(1);
          }

          await initDatabase();
          const db = getDatabase(argv['log-path'] as string);

          if (argv.before) {
            const beforeMs = parseDuration(argv.before);
            const beforeTimestamp = Date.now() - beforeMs;
            const result = db.run('DELETE FROM log_events WHERE timestamp < ?', [beforeTimestamp]);
            console.log(`Deleted ${result.changes} log events`);
          } else {
            if (!argv.force) {
              console.log('This will delete all log events. Use --force to confirm.');
              process.exit(1);
            }
            const result = db.run('DELETE FROM log_events');
            console.log(`Deleted ${result.changes} log events`);
          }
        } catch (err) {
          console.error('Error:', (err as Error).message);
          process.exit(1);
        }
      }
    )
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('h', 'help')
    .strict()
    .parse();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
