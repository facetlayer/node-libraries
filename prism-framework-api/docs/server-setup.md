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

  const app = new App(ALL_SERVICES);

  await startServer({
    app,
    port: parseInt(process.env.PRISM_API_PORT, 10),
    openapiConfig: {
        enable: true,
        enableSwagger: true,
    },
    corsConfig: {
        webBaseUrl: process.env.WEB_BASE_URL,
        enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === 'true',
    },
  });
}

main().catch(error => {
    console.error('Failed to start server:', error);
    process.exitCode = -1;
});
```

## Launching

The service should be launched through the Candle process manager. (TODO: add more details)

## Testing

Run `prism list-endpoints` to check that the local server is running and the endpoint listing is working.
