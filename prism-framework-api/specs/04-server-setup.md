# Server Setup

This guide explains how to set up and start an Express.js server using Spark Framework.

## Basic Server Setup

```typescript
import { startServer } from '@facetlayer/spark-framework';
import { ALL_SERVICES } from './services';

async function main() {
  await startServer({
    services: ALL_SERVICES,
    port: 3000, // Optional, defaults to PORT env var or 3000
  });
}

main().catch(console.error);
```

## Complete Example

```typescript
import { checkEnvVars, setLaunchConfig, startServer } from '@facetlayer/spark-framework';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import fs from 'fs';
import path from 'path';
import { ALL_SERVICES } from './services';

async function main() {
  // Check required environment variables
  checkEnvVars();

  // Create database directory
  const databasePath = process.env.SQLITE_DATABASE_PATH;
  if (!fs.existsSync(databasePath)) {
    fs.mkdirSync(databasePath, { recursive: true });
  }

  // Set up launch configuration
  setLaunchConfig({
    logging: {
      databaseFilename: path.join(databasePath, 'logs.db'),
      enableConsoleLogging: true,
      loadDatabase: await loadBetterSqlite(),
    },
    database: {
      user: {
        migrationBehavior: 'safe-upgrades',
        databasePath,
        services: ALL_SERVICES,
        loadDatabase: await loadBetterSqlite(),
      },
    },
  });

  // Start background jobs
  for (const service of ALL_SERVICES) {
    if (service.startJobs) {
      await service.startJobs();
    }
  }

  // Start server
  await startServer({
    services: ALL_SERVICES,
    logInfo: (msg) => console.log(`[INFO] ${msg}`),
    logDebug: (msg) => console.log(`[DEBUG] ${msg}`),
    logWarn: (msg) => console.warn(`[WARN] ${msg}`),
    logError: (msg, details, error) => console.error(`[ERROR] ${msg}`, details, error),
  });
}

main().catch(error => {
  console.error('Failed to start server:', error);
  process.exitCode = -1;
});
```

## Environment Variables

Required environment variables (checked by `checkEnvVars()`):

```bash
SQLITE_DATABASE_PATH=/path/to/databases
```

Optional environment variables:

```bash
PORT=3000
API_BASE_URL=https://api.example.com
WEB_BASE_URL=https://example.com
ENABLE_TEST_ENDPOINTS=true
ENABLE_DESKTOP_LOCAL_AUTH=true
```

## Built-in Endpoints

The framework provides these endpoints automatically:

### Health Check
```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Note**: Only accessible from localhost.

### Metrics
```
GET /metrics
```

Returns Prometheus-format metrics.

**Note**: Only accessible from localhost.

## Custom App Creation

For more control, create the Express app without starting it:

```typescript
import { createApp } from '@facetlayer/spark-framework';

const app = createApp({
  services: ALL_SERVICES,
  logInfo: console.log,
  logDebug: console.log,
  logWarn: console.warn,
  logError: console.error,
});

// Add custom middleware or routes
app.get('/custom', (req, res) => {
  res.json({ custom: true });
});

// Start the server manually
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Middleware Order

The framework sets up middleware in this order:

1. **CORS middleware** - Handles cross-origin requests
2. **Body parsing** - `express.json()` and `express.urlencoded()`
3. **Request context** - Creates request context with AsyncLocalStorage
4. **Cookie parser** - Parses cookies
5. **Service middleware** - Custom middleware from services
6. **Health/Metrics endpoints** - Built-in endpoints
7. **Service endpoints** - Your application endpoints
8. **404 handler** - Catches unmatched routes

## CORS Configuration

CORS is configured based on environment variables:

```typescript
// Allowed origins
const allowedOrigins = [
  `https://${config.webBaseUrl}`,
  'http://localhost:3445'
];

// Test mode: Allow any localhost port
if (config.enableTestEndpoints) {
  // Allows http://localhost:* in test mode
}
```

## Graceful Shutdown

The server handles `SIGTERM` for graceful shutdown:

```typescript
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## Logging

Provide custom logging functions to integrate with your logging system:

```typescript
await startServer({
  services: ALL_SERVICES,
  logInfo: (msg) => logger.info(msg),
  logDebug: (msg) => logger.debug(msg),
  logWarn: (msg) => logger.warn(msg),
  logError: (msg, details, error) => {
    logger.error(msg, { details, error });
  },
});
```

These loggers are used throughout the framework for:
- Request/response logging
- Error logging
- Validation failures
- Server startup/shutdown

## Request Context

Every request has an associated context accessible via AsyncLocalStorage:

```typescript
import { getCurrentRequestContext } from '@facetlayer/spark-framework';

// In any async function during request handling
const context = getCurrentRequestContext();

console.log(context.requestId);  // Unique request ID
console.log(context.startTime);   // Request start timestamp
console.log(context.auth);        // Authorization info
```

The request ID is also returned in the `X-Request-ID` response header.
