# @facetlayer/prism-framework-desktop

Electron desktop integration library for Prism Framework applications.

This library provides the necessary components to run a Prism Framework application as an Electron desktop app, with support for both development and release modes.

## Features

- **Dependency Injection**: Electron dependencies are injected into your application, keeping the Electron-specific code isolated
- **Development Mode Support**: Automatically connects to your Next.js dev server during development
- **Release Mode Support**: Loads pre-built static UI files in production
- **IPC Bridge**: Secure communication bridge between Electron main process and renderer
- **Type Safety**: Full TypeScript support with exported types

## Installation

```bash
pnpm add @facetlayer/prism-framework-desktop
pnpm add -D electron electron-builder
```

## Project Structure

A typical Prism Framework desktop application has this structure:

```
my-desktop-app/
├── api/                      # API server (uses HTTP in dev, IPC in release)
├── ui/                       # Next.js UI (dev server in dev, static in release)
└── desktop-app/              # Electron wrapper
    ├── src/
    │   ├── main.ts           # Copy from this library
    │   └── preload.ts        # Copy from this library
    └── package.json
```

## Development Modes

### Local Development Mode

In local development mode (`NODE_ENV=development`):

- **API Server**: Runs as an HTTP server that the UI connects to
- **UI**: Runs in live development mode using Next.js dev server with hot module replacement
- **Electron Window**: Shows the live development server URL (default: `http://localhost:4000`)

This mode is optimized for developer experience with fast refresh and easy debugging.

### Release Mode

In release mode (production):

- **API Server**: Bundled and uses IPC (Inter-Process Communication) for UI actions
- **UI**: Built as static files using `next build`
- **Electron Window**: Loads the pre-built static files from the filesystem

This mode is optimized for performance and package size.

## Usage

### Step 1: Copy Template Files

Copy `main.ts` and `preload.ts` from this library's `src` directory to your `desktop-app/src` directory:

```bash
cp node_modules/@facetlayer/prism-framework-desktop/src/main.ts desktop-app/src/
cp node_modules/@facetlayer/prism-framework-desktop/src/preload.ts desktop-app/src/
```

### Step 2: Create Desktop App Entry Point

In your `api/src/_main/desktop-main.ts`, create the main entry point that receives Electron dependencies:

```typescript
import { ElectronDependencies, DesktopMainConfig } from '@facetlayer/prism-framework-desktop';

export async function main(electron: ElectronDependencies, config: DesktopMainConfig) {
  const { app, BrowserWindow, ipcMain } = electron;

  // Wait for Electron to be ready
  await app.whenReady();

  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: config.windowWidth || 1200,
    height: config.windowHeight || 800,
    webPreferences: {
      preload: config.preloadJsPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the UI
  await mainWindow.loadURL(config.initialUrl);

  // Set up IPC handlers (only needed in release mode)
  if (!config.isDevelopment) {
    ipcMain.handle('apiCall', async (_event, method, path, options) => {
      // Handle API calls through your application logic
      // This replaces HTTP calls in release mode
    });

    // Set up stream handlers
    ipcMain.handle('subscribe', async (_event, streamId, path, options) => {
      // Handle stream subscriptions
    });

    ipcMain.handle('api-unsubscribe', async (_event, streamId) => {
      // Handle unsubscribe
    });
  }

  // Handle app lifecycle
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
```

### Step 3: Configure Desktop App Package

Create `desktop-app/package.json`:

```json
{
  "name": "@my-project/desktop-app",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/main.js",
  "private": true,
  "scripts": {
    "postinstall": "electron-builder install-app-deps",
    "dev": "NODE_ENV=development electron dist/main.js",
    "build": "tsc -p .",
    "package": "pnpm build && electron-builder",
    "package:mac": "pnpm build && electron-builder --mac",
    "package:win": "pnpm build && electron-builder --win"
  },
  "dependencies": {
    "electron": "32.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "electron-builder": "^26.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 4: Build and Run

```bash
# Development mode
cd desktop-app
pnpm build
pnpm dev

# Package for release
pnpm package
```

## Environment Variables

Configure the desktop app behavior with these environment variables:

- `NODE_ENV`: Set to `development` for dev mode, otherwise release mode
- `DATABASE_PATH`: Path to store application databases (default: `.data`)
- `WINDOW_WIDTH`: Initial window width (default: `1200`)
- `WINDOW_HEIGHT`: Initial window height (default: `800`)
- `INITIAL_URL`: Override the URL to load (defaults based on mode)

## Exported Types

The library exports the following TypeScript types:

- `ElectronDependencies`: Type for the injected Electron dependencies
- `DesktopMainConfig`: Configuration object passed to your main function
- `ElectronAPI`: Type for the `window.electron` API exposed to the renderer

## UI Integration

In your Next.js UI, you can detect if running in Electron and use the IPC bridge:

```typescript
// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electron;

// Make API calls
if (isElectron) {
  const result = await window.electron.apiCall('GET', '/api/my-endpoint', {});
} else {
  // Use fetch for web version or development mode
  const result = await fetch('/api/my-endpoint');
}
```

## License

MIT
