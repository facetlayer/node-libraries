---
name: server-setup
description: How to set up and start an Express.js server using Prism Framework
---

# Server Setup

This guide explains how to set up and start an Express.js server using Prism Framework.

## Quick Outline

Brief summary of the steps to setup a Prism server:

 - Use the `@facetlayer/prism-framework` library
 - Create an instance of `App` and use `startServer`
 - API endpoints are automatically mounted at `/api/`
 - Optionally serve web files (HTML/JS/CSS) from the same server
 - Use the env var `PRISM_API_PORT` as the service port.

## Server Setup Example

### API-only server

```typescript
import { App, startServer } from '@facetlayer/prism-framework';

const app = new App({ services: ALL_SERVICES });

await startServer({
  app,
  port: parseInt(process.env.PRISM_API_PORT || '4000', 10),
  openapiConfig: {
    enable: true,
    enableSwagger: true,
  },
});
```

All endpoints are mounted under `/api/`. For example, an endpoint defined with
`path: '/users'` is accessible at `GET /api/users`.

### Unified server with web files

To serve both API and web pages from a single process on one port, add the
`web` config option:

```typescript
import { App, startServer } from '@facetlayer/prism-framework';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new App({ services: ALL_SERVICES });

await startServer({
  app,
  port: parseInt(process.env.PRISM_API_PORT || '4000', 10),
  openapiConfig: {
    enable: true,
    enableSwagger: true,
  },
  web: {
    dir: join(__dirname, '..', 'web'),
  },
});
```

When `web` is configured:
 - API endpoints are served under `/api/` (e.g. `/api/users`, `/api/health`)
 - Web files are served from the specified directory at the root path (`/`)
 - In development: uses Vite dev server middleware if `vite` is installed (for HMR)
 - In production: serves static files from `web/dist/` (or `web/` if no dist folder)
 - SPA fallback: unmatched GET requests serve `index.html`

### Available framework endpoints

These are automatically available under `/api/`:

| Path | Description |
|------|-------------|
| `/api/health` | Health check (localhost only) |
| `/api/metrics` | Prometheus metrics (localhost only) |
| `/api/endpoints` | HTML endpoint listing |
| `/api/endpoints.json` | JSON endpoint listing |
| `/api/openapi.json` | OpenAPI schema (if enabled) |
| `/api/swagger` | Swagger UI (if enabled) |

## Launching with Candle

Use the `candle` process manager to run the server:

### Setup

Register the service in your `.candle.json`:

```json
{
  "services": [
    {
      "name": "my-app",
      "shell": "node src/main.ts"
    }
  ]
}
```

### Usage

```bash
# Start the service
candle start my-app

# Check status
candle ls

# View logs
candle logs my-app

# Restart after changes
candle restart my-app
```

### Recommended .env setup

```bash
PRISM_API_PORT=4000
```

## Vite Integration

To use Vite for frontend development with HMR:

1. Install `vite` as a dependency in your project
2. Place your web files in a `web/` directory with an `index.html`
3. Pass `web: { dir: './web' }` to `startServer`

In development mode, Vite's dev server middleware handles all non-API requests,
providing hot module replacement. In production, the built static files from
`web/dist/` are served.

## Testing

Run `prism list-endpoints` to check that the local server is running and the endpoint listing is working.
