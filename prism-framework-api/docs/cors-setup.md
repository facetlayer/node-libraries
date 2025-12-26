---
name: cors-setup
description: How to configure CORS (Cross-Origin Resource Sharing) for your Prism API server
---

# CORS Setup

This guide explains how to configure CORS (Cross-Origin Resource Sharing) for your Prism Framework API server.

## Overview

CORS controls which web origins can make requests to your API. The Prism Framework includes built-in CORS middleware that handles preflight requests and sets appropriate headers.

## Configuration Options

Pass a `corsConfig` object to `startServer`:

```typescript
import { startServer, App } from '@facetlayer/prism-framework-api';

await startServer({
  app,
  port: 4000,
  corsConfig: {
    webBaseUrl: 'example.com',
    enableTestEndpoints: false,
  },
});
```

### CorsConfig Interface

```typescript
interface CorsConfig {
  /** Base URL for web application (e.g., 'example.com' or 'https://example.com') */
  webBaseUrl?: string;

  /** Allow localhost origins for testing */
  enableTestEndpoints?: boolean;
}
```

## Option Details

### webBaseUrl

Specifies the production web domain that is allowed to make cross-origin requests.

- **Format**: Domain only (e.g., `'example.com'`) or full URL (e.g., `'https://example.com'`)
- **Behavior**: Allows requests from `https://{webBaseUrl}`
- **Typical usage**: Set via environment variable `WEB_BASE_URL`

```typescript
corsConfig: {
  webBaseUrl: process.env.WEB_BASE_URL,  // e.g., 'myapp.example.com'
}
```

### enableTestEndpoints

Enables CORS for any `http://localhost:*` origin (any port).

- **Default**: `false`
- **When `true`**: Allows any localhost origin for development/testing
- **When `false`**: Localhost origins are blocked
- **Typical usage**: Enable in development, disable in production

```typescript
corsConfig: {
  enableTestEndpoints: process.env.NODE_ENV !== 'production',
}
```

## Environment Variable Pattern

A common pattern is to configure CORS via environment variables:

```bash
# .env (development)
WEB_BASE_URL=localhost:3000
ENABLE_TEST_ENDPOINTS=true

# .env (production)
WEB_BASE_URL=myapp.example.com
ENABLE_TEST_ENDPOINTS=false
```

```typescript
corsConfig: {
  webBaseUrl: process.env.WEB_BASE_URL,
  enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === 'true',
}
```

## CORS Headers

The middleware automatically sets these headers on all responses:

| Header | Value |
|--------|-------|
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, DELETE, OPTIONS, PATCH` |
| `Access-Control-Allow-Headers` | `Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Cache-Control` |
| `Access-Control-Max-Age` | `86400` (24 hours) |

## Preflight Requests

The middleware automatically handles OPTIONS preflight requests by returning HTTP 200 with the appropriate CORS headers.

## Security Notes

- **Whitelist-based**: Only explicitly allowed origins receive the `Access-Control-Allow-Origin` header
- **No wildcards**: The middleware uses specific domain matching instead of `*`
- **Credentials enabled**: Supports cookie-based authentication
- **Non-matching origins**: Requests from non-allowed origins do not receive CORS headers, causing the browser to block the response

## Examples

### Development Setup (localhost only)

```typescript
await startServer({
  app,
  port: 4000,
  corsConfig: {
    enableTestEndpoints: true,
  },
});
```

### Production Setup

```typescript
await startServer({
  app,
  port: 4000,
  corsConfig: {
    webBaseUrl: 'myapp.example.com',
    enableTestEndpoints: false,
  },
});
```

### Combined Setup (development + production)

```typescript
await startServer({
  app,
  port: parseInt(process.env.PRISM_API_PORT, 10),
  corsConfig: {
    webBaseUrl: process.env.WEB_BASE_URL,
    enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === 'true',
  },
});
```

## Troubleshooting

### "No 'Access-Control-Allow-Origin' header" error

This means the requesting origin is not allowed. Check:

1. For localhost development: Ensure `enableTestEndpoints: true` is set
2. For production: Ensure `webBaseUrl` matches your frontend's domain
3. The request origin uses the correct protocol (https for production)

### Preflight requests failing

Ensure your server is running and the CORS middleware is configured. The middleware handles OPTIONS requests automatically.
