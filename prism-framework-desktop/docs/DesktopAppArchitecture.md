# Desktop app architectures

`prism-framework-desktop` supports two ways to connect an Electron window to a `PrismApp`. Pick the one that fits how your UI already calls the API.

## Option A — IPC bridge (no HTTP server)

Use this when you control the renderer code and want a zero-server desktop app.

```ts
// src/main.ts
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { createApp } from './createApp.js';

await desktopLaunch({
    app: createApp(),
    uiBuildPath: '/abs/path/to/web/index.html',
});
```

`desktopLaunch` registers an IPC handler that routes `window.electron.apiCall(method, path, { params })` straight to `app.callEndpoint`. The renderer either uses that bridge directly or calls `createDesktopFetch()` and hands the result to `setFetchImplementation()` from `@facetlayer/prism-framework-ui`.

**Pros:** no network layer, no port to manage, smaller attack surface, same-process error propagation through `ErrorDetails`.
**Cons:** requires a transport-agnostic renderer (either `apiFetch` + `setFetchImplementation`, or a small shim like `samples/notesApp/web/apiClient.js`). Doesn't work with code that imports `webFetch` directly.

Used by: `samples/notesApp`.

## Option B — Wrap a local Express server

Use this when the renderer is an existing React/Vue/Svelte bundle that calls the API over HTTP (e.g. uses `webFetch` directly) and you don't want to refactor it.

```ts
// src/desktop.ts
import { startServer } from '@facetlayer/prism-framework';
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import type { AddressInfo } from 'net';
import { createApp } from './createApp.js';

const app = createApp();

// Bind Express to an OS-assigned port so multiple desktop instances don't
// collide. Read the actual port back from the returned Server.
const server = await startServer({
    port: 0,
    app,
    web: { dir: '/abs/path/to/web' },
});
const { port } = server.address() as AddressInfo;

await desktopLaunch({
    app,
    devServerUrl: `http://localhost:${port}`,
});
```

The BrowserWindow loads the local Express URL. Relative-path `fetch` / `webFetch` calls in the UI hit the same origin, so existing HTTP-based code keeps working unchanged. The IPC handler still gets registered by `desktopLaunch` (harmless, unused).

**Pros:** works with any existing web UI, no renderer changes, plays nicely with Vite dev servers.
**Cons:** an HTTP server is running inside the desktop process; slightly larger attack surface (mitigate by binding to `127.0.0.1` only, which is the default).

Used by: `tickets-gui`.

## Port conflicts — always use port 0

**Never hardcode a port in a desktop app.** If you do, a second instance of the same app will crash with `EADDRINUSE`, and two different desktop apps that happen to pick the same port will fight.

Pass `port: 0` to `startServer`. Node/Express asks the OS for an unused port, binds it, and exposes the assigned port on `server.address().port` once listening. Read it back and pass it to `desktopLaunch`:

```ts
const server = await startServer({ port: 0, app, web: { dir } });
const { port } = server.address() as AddressInfo;
await desktopLaunch({ app, devServerUrl: `http://localhost:${port}` });
```

Desktop apps have no external consumers, so a stable URL isn't useful — the port doesn't need to be predictable. This pattern lets you run multiple instances of the same app concurrently (useful during development and for users who want two windows of your app open at once).

If you also want a dev-only mode for agent testing (see [ElectronTesting.md](ElectronTesting.md)), keep a separate `api.ts` / `serve.ts` entry point that uses a **fixed** port — that one's meant to be reachable from `playwright-cli` and benefits from a predictable URL.

## Electron + native modules

Electron bundles its own Node runtime. Some Prism dependencies (notably `@facetlayer/sqlite-wrapper`, which uses `node:sqlite`) need a Node version ≥ 22. That means **Electron 34 or newer** — the desktop lib, both samples, and `tickets-gui` are pinned to Electron 41 (Node 24).

If you hit `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`, upgrade Electron. If you use `better-sqlite3` instead, you'll need `electron-rebuild` to rebuild its native module against Electron's ABI.
