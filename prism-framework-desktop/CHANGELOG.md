# Unreleased
 - Unified error handling around `@facetlayer/streams`'s `ErrorDetails`. The main-process IPC handler now encodes endpoint errors (including `HttpError`s) into a serializable `ErrorDetails` payload via a new internal codec (`src/ipcErrors.ts`); `desktopFetch` re-hydrates them on the renderer as `ErrorWithDetails` so `errorId`, `errorType`, `stack`, `cause`, and `related` context survive the IPC boundary.
 - Added `@facetlayer/streams` as a workspace dependency (requires streams ≥ 1.0.1).
 - Added a `notesApp` sample under `samples/notesApp/` with two entry points — Electron (`main.ts`) and web/Express (`serve.ts`) — sharing one `createApp()` factory. A transport shim (`web/apiClient.js`) picks `window.electron.apiCall` or HTTP automatically so the same UI runs in both modes.
 - Added `docs/ElectronTesting.md` explaining how to drive the sample with `playwright-cli` by running it in web mode (Electron's Chromium rejects MCP's `Target.createBrowserContext` call, so direct attach isn't viable).
 - `desktopLaunch` now accepts a `PrismApp` and automatically wires the `prism:apiCall` IPC handler to `app.callEndpoint`, mirroring the Expo integration.
 - Added `createDesktopFetch` for the renderer — returns a fetch function compatible with `setFetchImplementation` from `@facetlayer/prism-framework-ui`.
 - Added `createApiCallHandler` as a standalone, Electron-free handler for unit tests and custom IPC wiring.
 - Added vitest test suite covering the fetch bridge and the main-process handler.
 - Added a workspace dependency on `@facetlayer/prism-framework` and moved the package into the root pnpm workspace.
 - Requires `electron >= 28` as a peer dependency (no longer a direct dep).

# 0.2.0
 - Initial public release.
