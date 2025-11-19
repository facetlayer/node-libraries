# Prism Framework Project Setup Guide

This guide walks through setting up a new project using the Prism Framework, which provides a type-safe API framework with automatic frontend client generation.

## Project Structure Overview

A typical Prism Framework project has this structure:

```
my-project/
├── package.json              # Root package.json with workspace configuration
├── pnpm-workspace.yaml       # PNPM workspace configuration
├── tsconfig.json            # Backend TypeScript configuration
├── .candle-setup.json       # Candle dev server configuration
├── .env                     # Environment variables
├── src/                     # Backend source code
│   ├── _main/
│   │   ├── api.ts          # API server entry point
│   │   ├── app.ts          # Application factory
│   │   └── services.ts     # Service definitions registry
│   └── [service-name]/     # Individual service directories
│       └── index.ts        # Service endpoint definitions
└── ui/                      # Frontend Next.js application
    ├── package.json         # UI package.json
    ├── tsconfig.json        # Frontend TypeScript configuration
    ├── next.config.js       # Next.js configuration
    ├── postcss.config.mjs   # PostCSS/Tailwind configuration
    └── src/
        ├── app/             # Next.js app directory
        │   ├── layout.tsx   # Root layout
        │   ├── page.tsx     # Home page
        │   └── globals.css  # Global styles with Tailwind
        ├── components/      # React components
        └── api/
            └── webFetch.ts  # API client wrapper
```

## Step-by-Step Setup

### 1. Initialize Project Root

Create your project directory and initialize it:

```bash
mkdir my-project
cd my-project
pnpm init
```

### 2. Configure Package Manager

Set PNPM as the package manager in `package.json`:

```json
{
  "name": "my-project",
  "type": "module",
  "packageManager": "pnpm@10.15.1",
  "private": true
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "ui"
```

### 3. Set Up Backend

#### Install Backend Dependencies

```bash
pnpm add @facetlayer/prism-framework-api @facetlayer/prism-framework-tools
pnpm add -D typescript tsx @types/node esbuild
```

Optional dependencies (based on your needs):
```bash
pnpm add dotenv better-sqlite3 zod
```

#### Create Backend TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": false,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "rootDir": ".",
    "baseUrl": ".",
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "ui"]
}
```

#### Create Backend Directory Structure

```bash
mkdir -p src/_main
```

Create `src/_main/services.ts`:

```typescript
import { type ServiceDefinition } from '@facetlayer/prism-framework-api';

export const ALL_SERVICES: ServiceDefinition[] = [
  // Add service definitions here
];
```

Create `src/_main/app.ts`:

```typescript
import { App } from '@facetlayer/prism-framework-api';
import { ALL_SERVICES } from './services.ts';

/**
 * Create and return the application instance
 */
export function getApp(): App {
  return new App(ALL_SERVICES);
}
```

Create `src/_main/api.ts`:

```typescript
import { startServer } from "@facetlayer/prism-framework-api";
import { getApp } from "./app.ts";
import { config } from 'dotenv';

async function main() {
    config({
        quiet: true,
        path: '.env',
    });

    if (!process.env.PORT) {
        throw new Error('PORT is not set');
    }

    const app = getApp();

    startServer({
        app,
        port: parseInt(process.env.PORT),
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

#### Add Backend Scripts to package.json

```json
{
  "scripts": {
    "dev:api": "tsx watch src/_main/api.ts",
    "build": "tsc -p .",
    "typecheck": "tsc -p ."
  }
}
```

#### Create Environment File

Create `.env`:

```bash
PORT=4302
WEB_BASE_URL=http://localhost:3000
ENABLE_TEST_ENDPOINTS=true
```

### 4. Create Your First Service

Create a new service directory:

```bash
mkdir -p src/my-service
```

Create `src/my-service/index.ts`:

```typescript
import { createEndpoint, type ServiceDefinition } from '@facetlayer/prism-framework-api';
import { z } from 'zod';

// Define request/response schemas
const zGetItemsRequest = z.object({});

const zGetItemsResponse = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
  }))
});

type GetItemsRequest = z.infer<typeof zGetItemsRequest>;
type GetItemsResponse = z.infer<typeof zGetItemsResponse>;

// Implement handler
async function getItems(input: GetItemsRequest): Promise<GetItemsResponse> {
  return {
    items: [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ]
  };
}

// Define endpoint
const getItemsEndpoint = createEndpoint<GetItemsRequest, GetItemsResponse>({
  method: 'GET',
  path: '/items',
  handler: getItems,
  requestSchema: zGetItemsRequest,
  responseSchema: zGetItemsResponse,
});

// Export service definition
export const definition: ServiceDefinition = {
  name: 'my-service',
  endpoints: [
    getItemsEndpoint,
  ],
};
```

Register the service in `src/_main/services.ts`:

```typescript
import { type ServiceDefinition } from '@facetlayer/prism-framework-api';
import { definition as myServiceDefinition } from '../my-service/index.ts';

export const ALL_SERVICES: ServiceDefinition[] = [
  myServiceDefinition,
];
```

### 5. Set Up Frontend (Next.js + Prism Framework UI)

#### Create UI Directory

```bash
mkdir ui
cd ui
pnpm init
```

#### Install Frontend Dependencies

```bash
pnpm add @facetlayer/prism-framework-ui next react react-dom
pnpm add -D typescript @types/node @types/react @types/react-dom
pnpm add -D tailwindcss @tailwindcss/postcss postcss autoprefixer
pnpm add -D eslint eslint-config-next dotenv-cli
```

Optional (for data fetching):
```bash
pnpm add @tanstack/react-query
```

#### Configure Frontend package.json

Update `ui/package.json`:

```json
{
  "name": "my-project-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "dotenv -e .env -- next dev",
    "build": "dotenv -e .env -- next build",
    "start": "dotenv -e .env -- next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "packageManager": "pnpm@10.15.1"
}
```

#### Create Frontend TypeScript Configuration

Create `ui/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noImplicitAny": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    },
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    ".next/types/**/*.ts",
    "next-env.d.ts",
    "src/app/**/*.ts",
    "src/app/**/*.tsx"
  ],
  "exclude": ["node_modules"]
}
```

#### Configure Next.js

Create `ui/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
```

#### Configure Tailwind CSS

Create `ui/postcss.config.mjs`:

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

#### Create Frontend Directory Structure

```bash
mkdir -p ui/src/app
mkdir -p ui/src/components
mkdir -p ui/src/api
```

Create `ui/src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-background: #ffffff;
  --color-foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: #0a0a0a;
    --color-foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  padding: 20px;
}

h1 {
  color: #333;
}
```

Create `ui/src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Project',
  description: 'My Prism Framework Project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
```

Create `ui/src/app/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <div className="app">
      <h1>Welcome to My Project</h1>
      <p>A Prism Framework Application</p>
    </div>
  );
}
```

#### Create API Client Wrapper

Create `ui/src/api/webFetch.ts`:

```typescript
import { webFetch as prismWebFetch, type ApiRequestOptions } from '@facetlayer/prism-framework-ui';

export function webFetch(path: string, options: ApiRequestOptions = {}): Promise<any> {
    return prismWebFetch(path, {
        ...options,
        host: process.env.NEXT_PUBLIC_API_URL,
    });
}
```

#### Create UI Environment File

Create `ui/.env`:

```bash
PORT=4302
NEXT_PUBLIC_API_URL=http://localhost:4302
```

### 6. Set Up Candle (Development Server Manager)

Candle is a tool for managing multiple development servers (API + UI) simultaneously.

#### Install Candle

```bash
cd .. # Back to project root
pnpm add -D @facetlayer/candle
```

#### Create Candle Configuration

Create `.candle-setup.json` in the project root:

```json
{
  "services": [
    {
      "name": "api",
      "root": ".",
      "shell": "pnpm dev:api"
    },
    {
      "name": "ui",
      "root": "./ui",
      "shell": "pnpm dev"
    }
  ]
}
```

**Configuration Options:**
- `name`: Service identifier (used in commands like `candle start <name>`)
- `root`: Working directory for the service (relative to project root)
- `shell`: Command to run the service (executed in the service's `root` directory)

#### Add Candle Scripts to Root package.json

```json
{
  "scripts": {
    "dev": "candle start",
    "dev:api": "tsx watch src/_main/api.ts",
    "dev:ui": "cd ui && pnpm dev"
  }
}
```

#### Using Candle

Start all services:
```bash
pnpm dev
```

Or use candle commands directly:
```bash
# Start all services
candle start

# Start specific service
candle start api
candle start ui

# List services
candle list

# View logs
candle logs api
candle logs ui

# Restart a service
candle restart api

# Stop a service
candle kill api
```

**Candle Features:**
- Runs multiple dev servers in parallel
- Automatic restart on crash
- Centralized log management
- Process lifecycle management
- Service-specific working directories

**Advanced Candle Configuration:**

You can add more services or customize commands:

```json
{
  "services": [
    {
      "name": "api",
      "root": ".",
      "shell": "tsx watch src/_main/api.ts"
    },
    {
      "name": "ui",
      "root": "./ui",
      "shell": "pnpm dev"
    },
    {
      "name": "worker",
      "root": ".",
      "shell": "tsx watch src/worker.ts"
    }
  ]
}
```

### 7. Install All Dependencies

From the project root:

```bash
# Install root dependencies
pnpm install

# Install UI dependencies
cd ui && pnpm install && cd ..
```

### 8. Start Development

Start both servers with Candle:

```bash
pnpm dev
```

This will start:
- API server on http://localhost:4302
- UI server on http://localhost:3000

Or start them individually:
```bash
# Terminal 1 - API
pnpm dev:api

# Terminal 2 - UI
pnpm dev:ui
```

### 9. Using the Prism Framework

#### Creating Type-Safe API Calls in the Frontend

The Prism Framework automatically generates TypeScript types from your backend endpoints. Here's how to use them:

```typescript
// In a React component
import { webFetch } from '@/api/webFetch';

async function fetchItems() {
  const response = await webFetch('/items', {
    method: 'GET'
  });
  return response.items;
}
```

The `webFetch` wrapper automatically:
- Uses the configured API host
- Handles authentication (if configured)
- Provides type safety based on your backend schemas
- Manages error handling

## Common Tasks

### Adding a New Endpoint

1. Create or update a service file in `src/[service-name]/index.ts`
2. Define schemas with Zod
3. Implement the handler function
4. Create the endpoint with `createEndpoint()`
5. Add to the service's endpoint array
6. The endpoint is automatically available to the frontend

### Adding Environment Variables

1. Add to `.env` for backend
2. Add to `ui/.env` for frontend (prefix with `NEXT_PUBLIC_` for client-side access)

### Database Integration

```bash
pnpm add better-sqlite3 @facetlayer/sqlite-wrapper
pnpm add -D @types/better-sqlite3
```

Then create database utilities in `src/database/`.

## Project Checklist

- [ ] Root package.json configured with workspace
- [ ] pnpm-workspace.yaml created
- [ ] Backend tsconfig.json configured
- [ ] Backend source structure created (src/_main)
- [ ] At least one service defined
- [ ] UI directory initialized
- [ ] UI package.json configured
- [ ] UI tsconfig.json configured
- [ ] Next.js config created
- [ ] Tailwind CSS configured
- [ ] API client wrapper created
- [ ] Environment files created (.env)
- [ ] Candle configuration created (.candle-setup.json)
- [ ] All dependencies installed
- [ ] Dev servers start successfully

## Troubleshooting

### Port Already in Use

Change the PORT in `.env` and `ui/.env` to different values.

### Module Resolution Issues

Ensure:
- `"type": "module"` is in all package.json files
- File extensions (.ts, .js) are included in imports
- `moduleResolution: "bundler"` is in tsconfig.json

### CORS Errors

Check that `WEB_BASE_URL` in `.env` matches your frontend URL.

### Candle Services Not Starting

- Verify `.candle-setup.json` paths are correct
- Check that service `root` directories exist
- Ensure shell commands are valid
- View logs with `candle logs <service-name>`

## Next Steps

1. Read the [Prism Framework API docs](../README.md) for advanced features
2. Add authentication to your endpoints
3. Set up a database with migrations
4. Create reusable UI components
5. Add React Query for better data fetching
6. Configure production builds

## Example Projects

See the `flpipeline` project for a complete working example:
- Multiple services (hint-service, claude-history-service)
- Database integration with SQLite
- Complex UI with multiple pages
- Candle configuration with multiple services
- Production build setup
