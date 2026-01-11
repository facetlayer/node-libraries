# @facetlayer/local-logs

Local logging library that stores logs in an SQLite database.

## Features

- Simple API: `info()`, `warn()`, `error()`
- Stores logs in SQLite database
- CLI tool for viewing and managing logs
- Automatic database creation and migration

## Installation

```bash
pnpm add @facetlayer/local-logs
```

## Usage

### Basic Usage

```typescript
import { initLogger, info, warn, error } from '@facetlayer/local-logs';

// Initialize the logger (must be called once at startup)
await initLogger();

// Log messages
info('User logged in', { userId: 123 });
warn('API rate limit approaching', { remaining: 10 });
error('Failed to connect to database', { error: 'Connection refused' });
```

### Custom Log Path

By default, logs are stored at `.logs/logs.db` in the current working directory.

```typescript
await initLogger({ logPath: './my-app/logs.db' });
```

### Create a Logger Instance

```typescript
import { initLogger, createLogger } from '@facetlayer/local-logs';

await initLogger();

const logger = createLogger({ logPath: './custom/logs.db' });

logger.info('Message');
logger.warn('Warning');
logger.error('Error');
```

### Direct Database Access

```typescript
import { initDatabase, getDatabase } from '@facetlayer/local-logs';

await initDatabase();
const db = getDatabase();

const recentErrors = db.list(
  'SELECT * FROM log_events WHERE level = ? ORDER BY timestamp DESC LIMIT ?',
  ['error', 10]
);
```

## CLI

The package includes a CLI tool for viewing and managing logs.

### List Recent Logs

```bash
# List last 100 logs
local-logs list-recent

# List logs from the last hour
local-logs list-recent --since 1h

# List logs from the last 30 minutes, limit to 50
local-logs list-recent --since 30m --limit 50

# Output as JSON
local-logs list-recent --json
```

### List Recent Errors

```bash
# List recent errors
local-logs list-recent-errors

# List errors from the last day
local-logs list-recent-errors --since 1d
```

### List Recent Warnings

```bash
local-logs list-recent-warnings --since 1h
```

### View Statistics

```bash
# Show log statistics
local-logs stats

# Show stats for the last hour
local-logs stats --since 1h
```

### Clear Logs

```bash
# Clear logs older than 7 days
local-logs clear --before 7d

# Clear all logs (requires --force)
local-logs clear --force
```

### Custom Log Path

Use `--log-path` with any command:

```bash
local-logs list-recent --log-path ./my-app/logs.db
```

## Database Schema

Logs are stored in the `log_events` table with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-incrementing primary key |
| level | TEXT | Log level: 'info', 'warn', or 'error' |
| message | TEXT | Log message |
| params_json | TEXT | JSON-encoded parameters (nullable) |
| timestamp | INTEGER | Unix timestamp in milliseconds |
| created_at | TEXT | ISO 8601 timestamp |

## Duration Format

Duration options accept the following formats:
- `30s` - 30 seconds
- `5m` - 5 minutes
- `1h` - 1 hour
- `7d` - 7 days

## License

MIT
