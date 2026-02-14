---
name: vite-setup
description: How to set up a Prism Framework frontend using Vite + React
---

# Vite + React Setup

This guide covers setting up a Prism Framework frontend using Vite instead of Next.js. Vite is a good choice for local tools and GUIs since it's lighter and doesn't require SSR.

## Project Structure

```
your-app/
├── api/
│   ├── package.json         # @facetlayer/prism-framework-api
│   ├── src/
│   │   └── _main/api.ts     # API server entry point
│   └── .env                 # Backend env vars
├── ui/
│   ├── package.json         # Vite + React + @facetlayer/prism-framework-ui
│   ├── src/
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── .env                 # Frontend env vars (VITE_ prefix)
└── package.json             # Root workspace
```

## Frontend Setup

### 1. Create the Vite project

```bash
cd ui
pnpm add react react-dom @facetlayer/prism-framework-ui
pnpm add -D vite @vitejs/plugin-react typescript
```

### 2. Configure Vite proxy

The simplest approach for local development is to proxy API requests through Vite to the Prism API server. This avoids CORS issues entirely.

**vite.config.ts:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4001,
    proxy: {
      // Proxy all non-asset requests to the API server.
      // Adjust the target port to match PRISM_API_PORT.
      '/': {
        target: 'http://localhost:4000',
        bypass(req) {
          // Let Vite handle HTML, JS, CSS, and HMR requests
          const accept = req.headers.accept || '';
          if (accept.includes('text/html')
              || req.url?.includes('.tsx')
              || req.url?.includes('.ts')
              || req.url?.includes('.js')
              || req.url?.includes('.css')
              || req.url?.startsWith('/@')
              || req.url?.startsWith('/src')
              || req.url?.startsWith('/node_modules')) {
            return req.url;
          }
        },
      },
    },
  },
});
```

With this proxy setup, `webFetch` works without any extra configuration because API requests go through the same origin.

### 3. Alternative: Use configureWebFetch

If you prefer not to use the Vite proxy (or need to call the API server directly), configure `webFetch` with the API base URL:

```typescript
// src/main.tsx
import { configureWebFetch } from '@facetlayer/prism-framework-ui';

configureWebFetch({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000',
});
```

When using this approach, make sure the API server has `allowLocalhost: true` in its CORS config.

## Environment Variables

Vite uses the `VITE_` prefix for environment variables exposed to client code (similar to `NEXT_PUBLIC_` in Next.js).

**ui/.env:**

```bash
VITE_API_URL=http://localhost:4000
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

Vite loads `.env` files automatically - no need for the `dotenv` package.

## Running Dev Servers

A Prism app with Vite needs two dev servers running simultaneously. Use `candle` to manage them:

```bash
candle add-service api "node --watch src/_main/api.ts" --root ./api
candle add-service ui "pnpm dev" --root ./ui
```

Then start both:

```bash
candle start api
candle start ui
```

## Using webFetch

With the proxy setup, use `webFetch` the same way as in any other Prism frontend. Do not use the `/api` prefix in paths.

```typescript
import { webFetch } from '@facetlayer/prism-framework-ui';

// GET request
const users = await webFetch('GET /users');

// POST with data
const newUser = await webFetch('POST /users', {
  params: { name: 'John', email: 'john@example.com' },
});

// Path parameters
const user = await webFetch('GET /users/:id', {
  params: { id: '123' },
});
```
