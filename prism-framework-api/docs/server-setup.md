---
name: server-setup
description: How to set up and start an Express.js server using Prism Framework
---

# Server Setup

This guide explains how to set up and start an Express.js server using Prism Framework.

## Quick Outline

Brief summary of the steps to setup a Prism server:

 - Use the `@facetlayer/prism-framework-api` library
 - Create an instance of `App` and use `startServer`
 - Use the `dotenv` library to load the local .env file
 - Use the env var `PRISM_API_PORT` as the service port.

## Server Setup Example

This setup file will typically be stored in `./src/_main/api.ts`:

```typescript
import { App, startServer } from '@facetlayer/prism-framework-api';
import { config } from 'dotenv';
import { ALL_SERVICES } from './services';

async function main() {
  // Load environment variables from .env file
  config({ path: '.env' });

  if (!process.env.PRISM_API_PORT) {
    throw new Error('PRISM_API_PORT is not set');
  }

  const app = new App({ services: ALL_SERVICES });

  await startServer({
    app,
    port: parseInt(process.env.PRISM_API_PORT, 10),
    openapiConfig: {
        enable: true,
        enableSwagger: true,
    },
    corsConfig: {
        webBaseUrl: process.env.WEB_BASE_URL,
        allowLocalhost: process.env.ALLOW_LOCALHOST === 'true',
    },
  });
}

main().catch(error => {
    console.error('Failed to start server:', error);
    process.exitCode = -1;
});
```

## Launching with Candle

A Prism app needs both an API server and a frontend dev server running simultaneously. Use the `candle` process manager to coordinate them.

### Setup

Register each service in your `.candle.json`:

```bash
candle add-service api "node --watch src/_main/api.ts" --root ./api
candle add-service ui "pnpm dev" --root ./ui
```

### Usage

```bash
# Start both services
candle start api
candle start ui

# Check status
candle ls

# View logs
candle logs api
candle logs ui

# Restart a service after changes
candle restart api
```

### Recommended .env setup

The API server reads from `./api/.env` (or root `.env`):

```bash
PRISM_API_PORT=4000
ALLOW_LOCALHOST=true
```

The frontend reads from `./ui/.env` (Vite) or `./web/.env` (Next.js):

```bash
# Vite
VITE_API_URL=http://localhost:4000

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Testing

Run `prism list-endpoints` to check that the local server is running and the endpoint listing is working.
