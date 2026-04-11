# Project setup

Step-by-step guide to setting up a new project that uses `@facetlayer/prism-framework-desktop`. By the end, you'll have an Electron app whose main process hosts a `PrismApp` and whose renderer loads your web UI.

Before starting, decide which architecture you want — see [DesktopAppArchitecture.md](./DesktopAppArchitecture.md) for the tradeoffs:

- **Option A — IPC bridge.** No HTTP server. The renderer talks to the main process through `window.electron.apiCall`. Best for new UIs you control.
- **Option B — Local Express server.** The main process runs a loopback Express server and the BrowserWindow loads `http://localhost:<port>`. Best when the UI is an existing HTTP-based bundle (Vite, React Query, etc.).

The `samples/notesApp` project is the canonical Option A reference. `tickets-gui` is the canonical Option B reference. Skim whichever matches your case alongside this doc.

## 1. Project layout

A typical layout has two sibling trees — one for the Node/Electron main process, one for the web renderer:

```
my-app/
├── package.json            # main-process package (Electron entry)
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── createApp.ts        # builds the shared PrismApp
│   ├── desktop.ts          # Electron entry (dist/desktop.js after build)
│   ├── api.ts              # optional: dev-only HTTP entry for testing
│   └── services/
│       └── my-service.ts
├── web/
│   ├── package.json        # web package (Vite, React, etc.)
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       └── main.tsx
└── assets/
    └── icon.png
```

Keep `createApp.ts` separate from both entry points so the HTTP entry (`api.ts`) and the Electron entry (`desktop.ts`) can share the same `PrismApp` configuration.

## 2. Install dependencies

In the main-process `package.json`:

```bash
pnpm add @facetlayer/prism-framework @facetlayer/prism-framework-desktop
pnpm add -D electron typescript @types/node
```

Pin Electron to `^41.0.0` or newer. Prism's SQLite wrapper uses `node:sqlite`, which requires Node ≥ 22, which requires Electron ≥ 34. See [DesktopAppArchitecture.md#electron--native-modules](./DesktopAppArchitecture.md#electron--native-modules).

In `web/package.json`, install your renderer stack. If you want the IPC bridge, also install:

```bash
pnpm add @facetlayer/prism-framework-ui
```

## 3. Main-process `package.json`

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/desktop.js",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:all": "pnpm build && pnpm --dir web build",
    "desktop": "electron dist/desktop.js",
    "desktop:dev": "pnpm build:all && pnpm desktop",
    "typecheck": "tsc --noEmit"
  }
}
```

Key points:

- `"type": "module"` — Prism and this library ship as ESM.
- `"main"` points at the **compiled** output. Electron's CLI loads the file named here; TypeScript sources won't run directly.
- Two-step dev loop: `build:all` compiles both the main process and the web bundle, then `desktop` launches Electron against the built output.

## 4. `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "allowImportingTsExtensions": false,
    "rewriteRelativeImportExtensions": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`rewriteRelativeImportExtensions` lets you write `import { createApp } from './createApp.ts'` in source and have TypeScript rewrite the extension to `.js` in the emitted output.

## 5. `src/createApp.ts`

```ts
import { App, type PrismApp } from '@facetlayer/prism-framework/core';
import { myService } from './services/my-service.ts';

export function createApp(): PrismApp {
    return new App({
        name: 'My App',
        description: 'Desktop interface for …',
        services: [myService],
    });
}
```

## 6. Electron entry point — `src/desktop.ts`

### Option A — IPC bridge

```ts
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './createApp.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiBuildPath = join(__dirname, '..', 'web', 'dist', 'index.html');
const iconPath = join(__dirname, '..', 'assets', 'icon.png');

function main() {
    return desktopLaunch({
        app: createApp(),
        appName: 'My App',
        title: 'My App',
        iconPath,
        uiBuildPath,
        windowWidth: 1200,
        windowHeight: 800,
    });
}

main().catch((err) => {
    console.error('[my-app] Failed to launch desktop app:', err);
    process.exit(1);
});
```

### Option B — Local Express server

```ts
import { startServer } from '@facetlayer/prism-framework';
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { AddressInfo } from 'net';
import { createApp } from './createApp.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = join(__dirname, '..', 'web');
const iconPath = join(__dirname, '..', 'assets', 'icon.png');

process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

async function main() {
    const app = createApp();

    const server = await startServer({
        port: 0,
        app,
        web: { dir: webDir },
    });

    const { port } = server.address() as AddressInfo;
    const devServerUrl = `http://localhost:${port}`;

    await desktopLaunch({
        app,
        appName: 'My App',
        title: 'My App',
        iconPath,
        devServerUrl,
        windowWidth: 1200,
        windowHeight: 800,
    });
}

main().catch((err) => {
    console.error('[my-app] Failed to launch desktop app:', err);
    process.exit(1);
});
```

### Two rules for the Electron entry file

1. **Never use top-level `await`.** Electron's `ready` event fires only after the main module finishes synchronous evaluation. A top-level `await` suspends the module, `app.whenReady()` never resolves, and the app hangs at launch with a bouncing dock icon. Always wrap async work in a `main()` function and call `main().catch(...)`.
2. **Bind to port 0.** Hardcoded ports crash on `EADDRINUSE` the moment a user opens a second window. Let the OS pick, then read the port back with `server.address().port`.

Both rules are covered in more detail in [DesktopAppArchitecture.md](./DesktopAppArchitecture.md).

## 7. Renderer setup

### Option A — wire `apiFetch` to the IPC bridge

In your renderer entry (e.g. `web/src/main.tsx`):

```ts
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import { createDesktopFetch } from '@facetlayer/prism-framework-desktop';

setFetchImplementation(createDesktopFetch());
```

Call this once, before any code issues an `apiFetch`. After that, `apiFetch('GET /items')` travels through `window.electron.apiCall` to the main process and lands in `app.callEndpoint`.

The preload script that exposes `window.electron` is shipped inside this package and wired up automatically by `desktopLaunch` — no custom preload required.

### Option B — nothing to do

The BrowserWindow loads the Express URL, so relative-path `fetch` / `webFetch` calls in the UI hit the same origin. Existing HTTP code keeps working unchanged.

## 8. Icons and window title

- `iconPath` should point at a PNG. It's applied to the `BrowserWindow` (taskbar / title bar on Windows/Linux) and, on macOS, to the dock via `app.dock.setIcon`. For packaged app icons, also configure `electron-builder` — `iconPath` is primarily for dev runs.
- `title` sets the initial window title. An HTML `<title>` tag in the loaded page will override this once the page loads, so most apps leave `title` unset and let the HTML drive the title.

## 9. Authorization

Desktop apps are single-user by default, so `desktopLaunch` passes an empty `Authorization` to each endpoint. If your endpoints check permissions, supply `getAuth`:

```ts
desktopLaunch({
    app,
    getAuth: () => {
        const auth = new Authorization();
        auth.setUserPermissions({ userId: 'local', permissions: ['read', 'write'] });
        return auth;
    },
    // ...
});
```

## 10. Optional dev-only HTTP entry — `src/api.ts`

It's often useful to keep a plain Node entry point alongside `desktop.ts` that starts the same `PrismApp` over HTTP on a **fixed** port. This is handy for:

- Running the API without launching Electron (faster iteration).
- Hitting endpoints from `curl` or Playwright during development.
- UI testing with tools like `playwright-cli` — see [ElectronTesting.md](./ElectronTesting.md).

```ts
import { startServer } from '@facetlayer/prism-framework';
import { createApp } from './createApp.ts';

startServer({ port: 4015, app: createApp(), web: { dir: 'web' } });
```

Use a fixed port here on purpose — the whole point is a predictable URL for external tools. `desktop.ts` still uses `port: 0`.

## 11. First run

```bash
pnpm build:all
pnpm desktop
```

You should see Electron launch, the BrowserWindow load your UI, and API calls round-trip through the `PrismApp`. If the window is blank or the dock icon bounces forever, the top three things to check are:

1. Top-level `await` in `desktop.ts` (symptom: bouncing dock, no window).
2. Wrong `uiBuildPath` — it must be the absolute path to a built `index.html`, not the Vite source.
3. `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` — upgrade Electron to ≥ 34.
