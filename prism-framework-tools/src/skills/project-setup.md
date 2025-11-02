# Prism Framework Project Setup Guide

This guide describes how to set up a new project using the Prism Framework libraries.

## Overview

The Prism Framework is a TypeScript-based framework for building full-stack web applications with a clear separation between API backend and UI frontend. It provides standardized patterns for Express-based APIs with SQLite databases and Next.js/React frontends.

## Architecture

A typical Prism Framework project follows this structure:

```
my-project/
├── api/                    # Backend API server
│   ├── src/
│   │   ├── _main/         # Main entry point and configuration
│   │   └── {services}/    # Service directories (one per feature area)
│   ├── package.json
│   └── .env
├── ui/                     # Frontend UI (web)
│   ├── src/
│   │   └── app/           # Next.js app router
│   ├── package.json
│   └── .env
├── tests/                  # Functional tests
│   ├── src/
│   ├── package.json
│   └── playwright.config.ts
├── .candle-setup.json     # Candle service configuration
├── pnpm-workspace.yaml    # PNPM workspace configuration
└── package.json           # Root package.json
```

## Development Modes

The Prism Framework supports two distinct development modes, particularly relevant for Electron-based applications:

### Local Development Mode

In local development mode, the framework runs all components separately for rapid iteration:

- **API Server**: Runs as an HTTP server (typically on port 3000) that the UI connects to over HTTP
- **UI**: Runs in live development mode using Next.js dev server with hot module replacement
- **Electron Window** (if applicable): Shows the live development server URL, allowing real-time updates

This mode is optimized for developer experience with fast refresh and easy debugging.

### Release Mode

In release mode, the framework bundles everything for production deployment:

- **API Server**: Bundled and uses IPC (Inter-Process Communication) for UI actions instead of HTTP
- **UI**: Built as static files using `next build` for optimal performance
- **Electron Window** (if applicable): Loads the pre-built static files directly from the filesystem

This mode is optimized for performance and package size, with all components pre-compiled and integrated.

## Prerequisites

- Node.js (v18 or later)
- PNPM (v10 or later)
- The Prism Framework libraries installed in `~/node-libraries` or available via NPM

## Step 1: Initialize Project Structure

### Create Root Directory and Workspace

```bash
# Create project directory
mkdir my-project
cd my-project

# Initialize root package.json
pnpm init

# Create workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "api"
  - "ui"
  - "tests"
EOF

# Create subdirectories
mkdir -p api/src/_main
mkdir -p ui/src/app
mkdir -p tests/src
```

### Configure PNPM for Better SQLite

Add the following to your root `package.json`:

```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "better-sqlite3"
    ]
  }
}
```

This ensures that `better-sqlite3` is built correctly in monorepo environments.

## Step 2: Set Up the API

### Install API Dependencies

```bash
cd api
pnpm add @facetlayer/prism-framework-api
pnpm add @facetlayer/sqlite-wrapper
pnpm add @facetlayer/streams
pnpm add express cookie-parser dotenv uuid zod better-sqlite3

pnpm add -D @types/express @types/cookie-parser @types/uuid @types/node
pnpm add -D typescript tsx vitest
```

### Create API package.json

```json
{
  "name": "@my-project/api",
  "version": "1.0.0",
  "description": "API server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/_main/main.ts",
    "build": "tsc -p .",
    "build:watch": "tsc -p . --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "imports": {
    "#src/*": "./src/*"
  },
  "packageManager": "pnpm@10.15.1"
}
```

### Create API TypeScript Configuration

Create `api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Create API Main Entry Point

Create `api/src/_main/main.ts`:

```typescript
import { checkEnvVars, startServer, setLaunchConfig } from '@facetlayer/prism-framework-api';
import { loadBetterSqlite } from '@facetlayer/sqlite-wrapper';
import { MigrationBehavior } from '@facetlayer/sqlite-wrapper';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  checkEnvVars();

  // Create database directory if it doesn't exist
  const databasePath = process.env.SQLITE_DATABASE_PATH || './databases';

  if (!fs.existsSync(databasePath)) {
    fs.mkdirSync(databasePath, { recursive: true });
  }

  const migrationBehavior = (process.env.DATABASE_MIGRATION_BEHAVIOR ||
    'safe-upgrades') as MigrationBehavior;

  const loggingDatabasePath = path.join(databasePath, 'logs.db');

  // Setup the launch config
  setLaunchConfig({
    logging: {
      databaseFilename: loggingDatabasePath,
      enableConsoleLogging: true,
      loadDatabase: await loadBetterSqlite(),
    },
    database: {
      user: {
        migrationBehavior,
        databasePath,
        services: [], // Add your services here
        loadDatabase: await loadBetterSqlite(),
      },
    },
  });

  // Launch server
  const port = parseInt(process.env.PORT || '3000', 10);
  await startServer({
    services: [], // Add your services here
    port,
  });

  console.log(`✅ API server running on port ${port}`);
}

export { main };

// Start the server when run directly
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
```

### Create API Environment Configuration

Create `api/.env`:

```bash
# Server Configuration
PORT=3000
API_BASE_URL=http://localhost:3000

# Database Configuration
SQLITE_DATABASE_PATH=./databases
DATABASE_MIGRATION_BEHAVIOR=safe-upgrades

# Optional: Enable test endpoints
ENABLE_TEST_ENDPOINTS=true
```

### Building API Services and Endpoints

The Prism Framework uses a service-based architecture. Each service can have:
- **Endpoints**: HTTP API endpoints
- **Actions**: Business logic functions
- **Database Tables**: SQLite schema and migrations

Example service structure in `api/src/my-service/`:

```typescript
// api/src/my-service/service.ts
import { ServiceDefinition, createEndpoint } from '@facetlayer/prism-framework-api';
import { z } from 'zod';

export const myService: ServiceDefinition = {
  name: 'my-service',
  endpoints: [
    createEndpoint({
      method: 'GET',
      path: '/api/my-resource',
      requestSchema: z.object({ id: z.string() }),
      responseSchema: z.object({ data: z.string() }),
      handler: async (input) => {
        return { data: `Hello ${input.id}` };
      },
    }),
  ],
};
```

## Step 3: Set Up the UI

### Install UI Dependencies

```bash
cd ui
pnpm add @facetlayer/prism-framework-ui
pnpm add next react react-dom
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add class-variance-authority clsx lucide-react tailwind-merge zod

pnpm add -D @types/node @types/react @types/react-dom
pnpm add -D typescript tailwindcss @tailwindcss/postcss dotenv-cli
pnpm add -D eslint eslint-config-next
```

### Create UI package.json

```json
{
  "name": "@my-project/ui",
  "version": "0.1.0",
  "private": true,
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

### Create UI TypeScript Configuration

Create `ui/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
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
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Create Next.js Configuration

Create `ui/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

### Create UI Environment Configuration

Create `ui/.env`:

```bash
# UI Server Configuration
PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Create Root Layout

Create `ui/src/app/layout.tsx`:

```typescript
import { QueryProvider } from '@facetlayer/prism-framework-ui';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

### Create Home Page

Create `ui/src/app/page.tsx`:

```typescript
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Welcome to My Project</h1>
    </main>
  );
}
```

### Configure Tailwind CSS

Create `ui/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Create `ui/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Accessing the API from UI

Create a client fetch helper in `ui/src/api/client.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

Use with React Query:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/api/client';

export default function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-data'],
    queryFn: () => fetchApi<{ data: string }>('/api/my-resource?id=123'),
  });

  if (isLoading) return <div>Loading...</div>;

  return <div>{data?.data}</div>;
}
```

## Step 4: Set Up Testing

### Install Test Dependencies

```bash
cd tests
pnpm add @facetlayer/prism-framework-tools
pnpm add -D @playwright/test @types/node typescript
```

### Create Tests package.json

```json
{
  "name": "@my-project/tests",
  "version": "0.1.0",
  "description": "Functional tests",
  "private": true,
  "scripts": {
    "install:browsers": "playwright install chromium",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug"
  },
  "packageManager": "pnpm@10.15.1"
}
```

### Create Playwright Configuration

Create `tests/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';
import { getPort } from '@facetlayer/prism-framework-tools';

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${getPort('ui')}`,
    trace: 'on-first-retry',
  },
});
```

### Create a Sample Test

Create `tests/src/home.test.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Welcome to My Project');
});
```

## Step 5: Configure Candle for Development

Create `.candle-setup.json` at the project root:

```json
{
  "servers": [
    {
      "name": "api",
      "root": "./api",
      "shell": "pnpm dev"
    },
    {
      "name": "ui",
      "root": "./ui",
      "shell": "pnpm dev"
    }
  ]
}
```

## Step 6: Development Workflow

### Starting Development Servers

Use the Candle MCP tool to start your services:

```bash
# Start both API and UI servers
candle start api ui
```

Or manually:

```bash
# Terminal 1 - API server
cd api
pnpm dev

# Terminal 2 - UI server
cd ui
pnpm dev
```

### Running Tests

```bash
cd tests
pnpm install:browsers  # First time only
pnpm test
```

### Building for Production

```bash
# Build API
cd api
pnpm build

# Build UI
cd ui
pnpm build
```

## Project Organization

### API Structure

Organize your API code using a service-based architecture:

- `api/src/_main/` - Entry points and app-wide configuration
- `api/src/{service-name}/` - One directory per service/feature area
  - `service.ts` - Service definition with endpoints
  - `actions.ts` - Business logic functions
  - `schema.ts` - Zod schemas for validation
  - `database.ts` - Database queries and migrations

### UI Structure

Organize your UI code by feature:

- `ui/src/app/` - Next.js pages using App Router
- `ui/src/components/` - Reusable React components
- `ui/src/api/` - API client functions
- `ui/src/lib/` - Utility functions

### Tools

Add development utilities in the project root:

- `tools/` - Helper scripts for development tasks
- `bin/` - Executable scripts

## Environment Variables

### Required Environment Variables

API (`api/.env`):
- `PORT` - API server port (default: 3000)
- `SQLITE_DATABASE_PATH` - Path to SQLite databases
- `DATABASE_MIGRATION_BEHAVIOR` - Migration strategy ('safe-upgrades' recommended)

UI (`ui/.env`):
- `PORT` - UI server port (default: 4000)
- `NEXT_PUBLIC_API_URL` - API server URL

## Common Patterns

### Creating a New Service

1. Create directory: `api/src/my-service/`
2. Define service with endpoints: `service.ts`
3. Add to services list in `main.ts`
4. Run server - database tables created automatically

### Adding a New UI View

1. Create page: `ui/src/app/my-page/page.tsx`
2. Create API client function in `ui/src/api/`
3. Use React Query for data fetching
4. Import and use Prism UI components

### Writing Functional Tests

1. Create test file in `tests/src/`
2. Use Playwright to automate browser interactions
3. Use `getPort()` from prism-framework-tools to find service ports
4. Run with `pnpm test`

## Tips

- Use PNPM workspaces for efficient dependency management
- Keep services focused on single feature areas
- Use Zod schemas for type-safe validation
- Use React Query for all API data fetching in the UI
- Use `better-sqlite3` for fast, embedded database
- Configure `onlyBuiltDependencies` in root package.json for better-sqlite3
- Use Candle for managing local development servers
- Write functional tests for critical user flows

## Example Projects

- **gstone** (`~/gstone`) - Full-featured MCP evaluation platform
- **simple-scheduler** (`~/simple-scheduler`) - Minimal example project

Both projects demonstrate the Prism Framework patterns in production applications.
