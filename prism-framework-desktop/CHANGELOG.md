# Unreleased
 - Added `packageDesktopApp` (exported from the new `@facetlayer/prism-framework-desktop/packaging` subpath). Builds a macOS `.app` bundle that fixes the "Electron" label shown in the menu bar, dock, and App Switcher during local dev. Copies `Electron.app` out of node_modules, patches `Info.plist` (`CFBundleName`/`CFBundleDisplayName`/`CFBundleIdentifier`/`CFBundleExecutable`), renames the executable, and installs a tiny loader shim in `Contents/Resources/app/` that dynamically imports the real main entry from the project directory. The shim approach sidesteps pnpm workspace / symlink issues that make electron-builder painful to configure. The generated bundle is ad-hoc codesigned. macOS only; other platforms should keep using `electron dist/desktop.js` directly.
 - Bumped the `electron` dev/peer dependency to `^41.0.0` (Node 24), required for `node:sqlite` support used by `@facetlayer/sqlite-wrapper`. Electron 32 / Node 20 crashed with `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`.
 - Added `docs/DesktopAppArchitecture.md` covering the two supported wiring patterns (IPC bridge vs. wrap-localhost) and the port-0 pattern for concurrent desktop instances.
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
