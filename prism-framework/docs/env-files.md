---
name: env-files
description: Recommended strategy for environment variable configuration in Prism Framework projects
---

# Environment Files Strategy

The typical env variables needed for a Prism app are:

### Backend

Next to the API / backend code there should be a .env file with:


| name | example value | description |
| ---- | ------------- | ----------- |
| PRISM_API_PORT | `<port number>` | The port for the web server |
| DATABASE_DIR | data | The relative path to a folder that has SQlite databases |
| WEB_BASE_URL | `http://localhost:<number>` | The URL for the web server |
| ALLOW_LOCALHOST | `true` | Whether to allow localhost CORS origins for local development |

### Frontend

#### Next.js

| name | example value | description |
| ---- | ------------- | ----------- |
| PORT | `<port number>` | The port for the web server. Should match WEB_BASE_URL from the backend. |
| NEXT_PUBLIC_API_URL | `http://localhost:<number>` | The URL for the API server. Should match PRISM_API_PORT from the backend. |

Remember that if a variable is used in the frontend code, it needs a prefix of `NEXT_PUBLIC_`.

Next.js doesn't load the .env file by default so it's recommended to have this script in package.json:

  "scripts": {
    "dev": "dotenv -e .env next dev",
    ...
  },

#### Vite

| name | example value | description |
| ---- | ------------- | ----------- |
| VITE_API_URL | `http://localhost:<number>` | The URL for the API server. Only needed if not using the Vite proxy approach. |

Vite uses the `VITE_` prefix instead of `NEXT_PUBLIC_` for client-exposed variables. Vite loads `.env` files automatically — no extra setup needed.

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

See the `vite-setup` doc in `@facetlayer/prism-framework-ui` for more details.

## Loading .env in the Backend

Use `dotenv` to load your `.env` file early in your server entry point:

```typescript
import { config } from 'dotenv';
config({ path: '.env' });
```

This should be called before accessing any `process.env` values. The `dotenv` package is included when you install `@facetlayer/prism-framework`'s recommended dependencies (see `getting-started` doc).

# Port assignment

It's recommended to use the `@facetlayer/port-assignment` tool if you need to assign new unique port numbers.

Example:

    npx @facetlayer/port-assignment claim --name <project name>

Run `npx @facetlayer/port-assignment list-docs` for more documentation.
