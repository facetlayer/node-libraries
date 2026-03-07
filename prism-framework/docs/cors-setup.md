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
import { startServer, App } from '@facetlayer/prism-framework';

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

  /** Allow any localhost origin (http://localhost:*) for local development */
  allowLocalhost?: boolean;

  /** @deprecated Use `allowLocalhost` instead */
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

### allowLocalhost

Enables CORS for any `http://localhost:*` origin (any port). This is the recommended setting for local development where the API server and frontend run on different ports.

- **Default**: `false`
- **When `true`**: Allows any localhost origin for development
- **When `false`**: Localhost origins are blocked
- **Typical usage**: Enable in development, disable in production

```typescript
corsConfig: {
  allowLocalhost: process.env.NODE_ENV !== 'production',
}
```

### enableTestEndpoints (deprecated)

Use `allowLocalhost` instead. When both are set, `allowLocalhost` takes precedence.

## Environment Variable Pattern

A common pattern is to configure CORS via environment variables:

```bash
# .env (development)
WEB_BASE_URL=localhost:3000
ALLOW_LOCALHOST=true

# .env (production)
WEB_BASE_URL=myapp.example.com
ALLOW_LOCALHOST=false
```

```typescript
corsConfig: {
  webBaseUrl: process.env.WEB_BASE_URL,
  allowLocalhost: process.env.ALLOW_LOCALHOST === 'true',
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
    allowLocalhost: true,
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
    allowLocalhost: process.env.ALLOW_LOCALHOST === 'true',
  },
});
```

## Troubleshooting

### "No 'Access-Control-Allow-Origin' header" error

This means the requesting origin is not allowed. Check:

1. For localhost development: Ensure `allowLocalhost: true` is set
2. For production: Ensure `webBaseUrl` matches your frontend's domain
3. The request origin uses the correct protocol (https for production)

### Preflight requests failing

Ensure your server is running and the CORS middleware is configured. The middleware handles OPTIONS requests automatically.
