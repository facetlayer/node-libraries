# @facetlayer/prism-framework-desktop

Electron integration for [Prism Framework](../prism-framework) applications.

Wires a `PrismApp` into an Electron main process and provides an IPC bridge that the renderer can use as a drop-in replacement for HTTP fetch. The UI calls endpoints on `window.electron.apiCall`, which forwards them to `app.callEndpoint` in the main process — no localhost server required.

## Installation

```bash
pnpm add @facetlayer/prism-framework-desktop @facetlayer/prism-framework
pnpm add -D electron
```

`electron` is declared as an optional peer dependency so the library can be imported from non-Electron contexts (e.g. the renderer module).

## Architecture

```
┌─────────── main process ────────────┐        ┌────── renderer ──────┐
│  desktopLaunch({ app })              │  IPC   │  createDesktopFetch  │
│    ├─ ipcMain.handle('prism:apiCall')│ ◀────▶ │    → window.electron │
│    └─ BrowserWindow + preload        │        │    → apiFetch        │
└──────────────────────────────────────┘        └──────────────────────┘
```

- **Main process** runs the `PrismApp` and registers an IPC handler that routes `apiCall` messages through `callEndpoint`.
- **Preload script** (shipped in this package) exposes `window.electron.apiCall` to the renderer.
- **Renderer** uses `createDesktopFetch()` and passes the result to `setFetchImplementation()` from `@facetlayer/prism-framework-ui`, so UI code written against `apiFetch` works without changes.

## Usage

### Main process (`electron/main.ts`)

```typescript
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { App } from '@facetlayer/prism-framework/core';
import { myService } from '../api/src/myService.js';

const app = new App({
    name: 'My Desktop App',
    services: [myService],
});

await desktopLaunch({
    app,
    appName: 'My Desktop App',
    // Use the dev server during development...
    devServerUrl: process.env.NODE_ENV === 'development'
        ? 'http://localhost:4000'
        : undefined,
    // ...or load the built static UI in production.
    uiBuildPath: process.env.NODE_ENV === 'development'
        ? undefined
        : '/absolute/path/to/ui/dist/index.html',
});
```

`desktopLaunch` handles `app.whenReady()`, creates the `BrowserWindow`, registers the IPC handler, and starts any `startJobs` declared on your services.

### Renderer

```typescript
import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import { createDesktopFetch } from '@facetlayer/prism-framework-desktop';

setFetchImplementation(createDesktopFetch());
```

After this, UI code that calls `apiFetch('GET /items')` goes through Electron IPC to the main process and returns whatever `callEndpoint` returns.

### Preload script

`desktopLaunch` automatically points `webPreferences.preload` at the preload shipped with this package. If you need to bundle your own preload, import the path and use it directly:

```typescript
import { getFrameworkPreloadPath } from '@facetlayer/prism-framework-desktop';

new BrowserWindow({
    webPreferences: {
        preload: getFrameworkPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
    },
});
```

## Authorization

Desktop apps are usually single-user, so the default `Authorization` passed to endpoints is empty. If your endpoints need user context, provide `getAuth`:

```typescript
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

## Testing

```bash
pnpm test
```

The test suite uses Vitest and covers:

- `createDesktopFetch` with a mock bridge, verifying method/path parsing and the `window.electron` fallback.
- `createApiCallHandler` against a real `PrismApp`, verifying routing, path params, request-context wiring, and error normalization.

The Electron main-process launcher itself is not exercised in unit tests (it would require a running Electron binary). To smoke-test end-to-end, build the library and run it inside an Electron project.

## Exports

| Export | Process | Purpose |
|---|---|---|
| `desktopLaunch(options)` | main | Launches Electron, wires IPC, creates window |
| `getFrameworkPreloadPath()` | main | Absolute path to the shipped preload script |
| `createApiCallHandler(app, options)` | main | IPC handler factory (electron-free; used by `desktopLaunch`) |
| `createDesktopFetch(options?)` | renderer | Fetch function compatible with `@facetlayer/prism-framework-ui` |
| `ElectronAPI` | types | Shape of `window.electron` |

## License

MIT
