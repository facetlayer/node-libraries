# Agent-driven testing for Prism desktop apps

Electron apps are awkward to drive from browser-automation tools. Every MCP-based tool (including `playwright-cli` and Microsoft's `@playwright/mcp`) calls `Target.createBrowserContext` on connect, and Electron's Chromium doesn't implement that CDP method — connection succeeds, then the very next call fails with:

```
Protocol error (Target.createBrowserContext): Failed to create browser context.
```

Rather than patching Playwright or depending on a community fork, we run the same Prism app in **two modes** during development and let the agent test the web mode:

| Mode | Transport | Entry point | Use case |
|---|---|---|---|
| Electron | IPC via `window.electron.apiCall` | `dist/main.js` | Day-to-day usage, release build |
| Web | HTTP via Express | `dist/serve.js` | Agent-driven UI testing, debugging in a regular browser |

Both modes use the same `PrismApp`, the same service definitions, and the same HTML. The only difference is which transport the browser-side API client selects at load time.

## How it works

### 1. Shared app factory

The sample has one place that builds the `PrismApp`:

```ts
// samples/notesApp/src/createApp.ts
import { App } from '@facetlayer/prism-framework/core';
import { notesService } from './notesService.js';

export function createApp() {
    return new App({
        name: 'Prism Notes Sample',
        services: [notesService],
    });
}
```

Both entry points import this function. If a bug reproduces in web mode, it reproduces in Electron mode too, because they're executing the exact same handlers.

### 2. Two entry points

**Electron** (`src/main.ts`) hands the app to `desktopLaunch`, which wires the main-process IPC handler:

```ts
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { createApp } from './createApp.js';

desktopLaunch({
    app: createApp(),
    uiBuildPath: resolve(__dirname, '../web/index.html'),
});
```

**Web** (`src/serve.ts`) hands the app to Prism's `startServer`, which mounts endpoints at `/api/*` and serves the `web/` directory as static files:

```ts
import { startServer } from '@facetlayer/prism-framework';
import { createApp } from './createApp.js';

await startServer({
    app: createApp(),
    port: 4810,
    web: { dir: resolve(__dirname, '../web') },
});
```

### 3. Transport-agnostic UI

The HTML loads a small `apiClient.js` that picks one transport up front and exposes a single `window.api.call(method, path, params)` function:

```js
// samples/notesApp/web/apiClient.js (simplified)
if (window.electron && window.electron.apiCall) {
    // Electron — forward directly over IPC
    window.api = {
        transport: 'electron',
        call: (method, path, params) =>
            window.electron.apiCall(method, path, { params }),
    };
} else {
    // Web — substitute :params into /api/<path>, then fetch
    window.api = {
        transport: 'http',
        call: (method, path, params) => httpFetch(method, path, params),
    };
}
```

Call sites never branch:

```js
await window.api.call('GET', '/notes');
await window.api.call('POST', '/notes', { title, body });
await window.api.call('DELETE', '/notes/:id', { id });
```

The status line in the sample shows `Connected (electron)` or `Connected (http)` so you can see at a glance which transport is live.

## Running the sample in web mode

From `samples/notesApp/`:

```bash
# One-shot
pnpm build
pnpm serve
# → Server now listening on port 4810

# As a managed background service
candle start prism-desktop-sample-web
candle logs prism-desktop-sample-web
```

Then open `http://localhost:4810/` in a regular browser, or drive it with an agent.

## Driving the web mode with `playwright-cli`

This is the workflow that doesn't work against raw Electron but works perfectly against the web mode:

```bash
# 1. Start the web server (if not already running)
candle start prism-desktop-sample-web

# 2. Open the page
playwright-cli open http://localhost:4810/

# 3. Snapshot — get refs for every interactive element
playwright-cli snapshot
# …prints an accessibility tree with stable refs like e6 (title input),
#   e7 (body input), e8 (Add note button), e13/e19 (Delete buttons).

# 4. Interact
playwright-cli fill e6 "Testing with playwright-cli"
playwright-cli fill e7 "An agent added this"
playwright-cli click e8

# 5. Verify — re-snapshot and check the status line / notes list
playwright-cli snapshot
# → status line reads: "Connected (http) · 3 note(s)"

# 6. Clean up
playwright-cli close
```

Because the handlers the agent is exercising are the same handlers Electron would call, a green interaction in web mode is strong evidence that the Electron path works too — assuming the Electron-specific wiring (preload, IPC channel names, window creation) is covered by the library's vitest suite, which it is.

## What this approach is and isn't

**It is:**
- A way to test your endpoint + UI contract with any standard browser tool.
- A way to debug the UI in Chrome DevTools without Electron's fiddly devtools window.
- A way for an agent to verify a feature end-to-end without writing a test file.

**It isn't:**
- A test of Electron-specific code paths. IPC channel wiring, preload script loading, `BrowserWindow` options, native menus — none of that is exercised here. Those are covered by:
  - The vitest suite in `prism-framework-desktop/src/__tests__/` (unit tests for `createApiCallHandler`, `createDesktopFetch`).
  - Manual smoke-test of `candle start prism-desktop-sample` (Electron mode) before a release.

## Adding this to your own app

1. Factor your `new App({...})` call into a `createApp()` function so both entry points can import it.
2. Create a `serve.ts` alongside `main.ts` that calls `startServer({ app: createApp(), port, web: { dir } })`.
3. In your HTML/UI, use a single client helper that checks for `window.electron.apiCall` and falls back to HTTP fetches against `/api/<path>`. Copy `samples/notesApp/web/apiClient.js` as a starting point if you're using plain HTML; if you're using React, use `@facetlayer/prism-framework-ui`'s `setFetchImplementation` + `createDesktopFetch` for the Electron transport and leave the default `webFetch` for web mode.
4. Add a candle service (or an `npm run serve` script) that runs the web entry point on a dev port.

The whole pattern is about 40 lines of glue. No library additions, no test framework to learn — just `playwright-cli` the way you already use it for web apps.
